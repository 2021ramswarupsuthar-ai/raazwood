import { NextResponse } from 'next/server';
import { verifySchema } from '@/lib/validators';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { getOrderByPublicId, markOrderPaid } from '@/server/orders';
import { clientIp, jsonError, limiters, tooMany } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = limiters.verify.check(clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfterMs);
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return jsonError('Payments not configured', 503);

  const parsed = verifySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError('Invalid request');
  const b = parsed.data;

  const order = await getOrderByPublicId(b.publicId);
  if (!order || order.razorpayOrderId !== b.razorpay_order_id) return jsonError('Order not found', 404);
  if (!verifyPaymentSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature, secret)) {
    return jsonError('Payment signature mismatch', 400);
  }
  // The signature binds this payment to this Razorpay order, whose amount was fixed server-side.
  const result = await markOrderPaid({ razorpayOrderId: b.razorpay_order_id, razorpayPaymentId: b.razorpay_payment_id, amountPaise: order.totalPaise, raw: { via: 'client-verify' } });
  return NextResponse.json({ ok: result === 'PAID' || result === 'ALREADY_PAID', result });
}
