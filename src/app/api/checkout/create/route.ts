import { NextResponse } from 'next/server';
import { checkoutSchema } from '@/lib/validators';
import { abandonOrder, attachRazorpayOrder, createPendingOrder, OrderError } from '@/server/orders';
import { createRazorpayOrder } from '@/lib/razorpay';
import { clientIp, jsonError, limiters, tooMany } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = limiters.checkout.check(clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfterMs);

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return jsonError('Online payment is not configured yet. Please contact us on WhatsApp to place your order.', 503);

  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(first ? `${first.path.join('.')}: ${first.message}` : 'Invalid details', 400);
  }

  let order;
  try {
    order = await createPendingOrder(parsed.data);
  } catch (e) {
    if (e instanceof OrderError) return jsonError(e.message, e.code === 'OUT_OF_STOCK' || e.code === 'ITEM_UNAVAILABLE' ? 409 : 400, { code: e.code });
    console.error('createPendingOrder failed', e);
    return jsonError('Could not create your order. Please try again.', 500);
  }

  try {
    const rp = await createRazorpayOrder({ amountPaise: order.totalPaise, receipt: order.publicId, notes: { orderId: order.publicId }, keyId, keySecret });
    await attachRazorpayOrder(order.id, rp.id);
    return NextResponse.json({ publicId: order.publicId, razorpayOrderId: rp.id, amountPaise: order.totalPaise, keyId, expiresAt: order.expiresAt });
  } catch (e) {
    console.error('razorpay order failed', e);
    await abandonOrder(order.id).catch(() => undefined); // give the stock back
    return jsonError('Payment service is unavailable right now. Please try again in a minute.', 502);
  }
}
