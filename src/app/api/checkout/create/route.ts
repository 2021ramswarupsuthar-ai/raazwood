import { NextResponse } from 'next/server';
import { checkoutSchema } from '@/lib/validators';
import { abandonOrder, attachRazorpayOrder, createPendingOrder, OrderError } from '@/server/orders';
import { createRazorpayOrder } from '@/lib/razorpay';
import { clientIp, jsonError, limiters, tooMany } from '@/server/http';
import { paymentMode } from '@/server/payments-config';
import { getCustomer } from '@/server/customer-auth';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = limiters.checkout.check(clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfterMs);

  const mode = paymentMode();
  if (mode === 'none') return jsonError('Online payment is not configured yet. Please contact us on WhatsApp to place your order.', 503);

  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(first ? `${first.path.join('.')}: ${first.message}` : 'Invalid details', 400);
  }
  const input = parsed.data;
  const customer = await getCustomer();

  let order;
  try {
    order = await createPendingOrder(input, { customerId: customer?.id ?? null, method: mode === 'manual_upi' ? 'MANUAL_UPI' : 'RAZORPAY' });
  } catch (e) {
    if (e instanceof OrderError) return jsonError(e.message, e.code === 'OUT_OF_STOCK' || e.code === 'ITEM_UNAVAILABLE' ? 409 : 400, { code: e.code, ...(e.missing ? { missing: e.missing } : {}) });
    console.error('createPendingOrder failed', e);
    return jsonError('Could not create your order. Please try again.', 500);
  }

  // Logged-in customers can keep this address for next time (skipped if the same address is already saved).
  if (customer && input.saveAddress) {
    const a = input.address;
    const same = await prisma.address.findFirst({ where: { customerId: customer.id, line1: a.line1, pincode: a.pincode }, select: { id: true } });
    if (!same) {
      const count = await prisma.address.count({ where: { customerId: customer.id } });
      if (count < 10) await prisma.address.create({ data: { customerId: customer.id, name: input.customer.name, phone: order.phone, line1: a.line1, line2: a.line2 || null, city: a.city, stateCode: a.stateCode.toUpperCase(), pincode: a.pincode, isDefault: count === 0 } });
    }
  }
  if (customer && !customer.name) await prisma.customer.update({ where: { id: customer.id }, data: { name: input.customer.name, email: customer.email ?? (input.customer.email || null) } });

  if (mode === 'manual_upi') {
    return NextResponse.json({ method: 'manual_upi', publicId: order.publicId, amountPaise: order.totalPaise, expiresAt: order.expiresAt });
  }

  const keyId = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  try {
    const rp = await createRazorpayOrder({ amountPaise: order.totalPaise, receipt: order.publicId, notes: { orderId: order.publicId }, keyId, keySecret });
    await attachRazorpayOrder(order.id, rp.id);
    return NextResponse.json({ method: 'razorpay', publicId: order.publicId, razorpayOrderId: rp.id, amountPaise: order.totalPaise, keyId, expiresAt: order.expiresAt });
  } catch (e) {
    console.error('razorpay order failed', e);
    await abandonOrder(order.id).catch(() => undefined); // give the stock back
    return jsonError('Payment service is unavailable right now. Please try again in a minute.', 502);
  }
}
