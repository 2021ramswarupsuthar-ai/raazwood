import { NextResponse } from 'next/server';
import { isValidUtr, normalizeUtr } from '@/lib/upi';
import { submitUtr } from '@/server/orders';
import { clientIp, jsonError, limiters, tooMany } from '@/server/http';

export const dynamic = 'force-dynamic';

const MESSAGES = {
  NOT_FOUND: 'Order not found.',
  NOT_PENDING: 'This order is not waiting for payment.',
  EXPIRED: 'This order has expired. Please contact us on WhatsApp if you have already paid.',
  UTR_USED: 'This UPI reference has already been used. Please check the number in your UPI app.',
} as const;

export async function POST(req: Request) {
  const rl = limiters.utr.check(clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfterMs);
  const body = (await req.json().catch(() => null)) as { publicId?: unknown; utr?: unknown } | null;
  const publicId = typeof body?.publicId === 'string' ? body.publicId.slice(0, 40) : '';
  const utr = typeof body?.utr === 'string' ? normalizeUtr(body.utr) : '';
  if (!publicId || !isValidUtr(utr)) return jsonError('Enter the 12-digit UPI reference (UTR) from your UPI app.');
  const r = await submitUtr(publicId, utr);
  if (r !== 'OK') return jsonError(MESSAGES[r], r === 'NOT_FOUND' ? 404 : 409);
  return NextResponse.json({ ok: true });
}
