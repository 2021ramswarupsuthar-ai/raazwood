import { createHmac, timingSafeEqual } from 'node:crypto';

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Checkout success signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  const expected = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook_secret). Must use the RAW body string. */
export function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string; status: string };

export async function createRazorpayOrder(args: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
  keyId: string;
  keySecret: string;
  fetchImpl?: typeof fetch;
}): Promise<RazorpayOrder> {
  const f = args.fetchImpl ?? fetch;
  const res = await f('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${args.keyId}:${args.keySecret}`).toString('base64'),
    },
    body: JSON.stringify({ amount: args.amountPaise, currency: 'INR', receipt: args.receipt, notes: args.notes ?? {} }),
  });
  if (!res.ok) throw new Error(`Razorpay order creation failed (${res.status})`);
  return (await res.json()) as RazorpayOrder;
}
