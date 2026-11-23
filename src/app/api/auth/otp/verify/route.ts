import { NextResponse } from 'next/server';
import { normalizeIndianMobile } from '@/lib/phone';
import { verifyOtp } from '@/server/otp-service';
import { startCustomerSession } from '@/server/customer-auth';
import { clientIp, jsonError, limiters, tooMany } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = limiters.otpVerify.check(clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfterMs);
  const body = (await req.json().catch(() => null)) as { phone?: unknown; code?: unknown } | null;
  const phone = typeof body?.phone === 'string' ? normalizeIndianMobile(body.phone) : null;
  const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
  if (!phone || code.length !== 6) return jsonError('Enter the 6-digit code we sent you.');
  const r = await verifyOtp(phone, code);
  if (!r.ok) return jsonError(r.error, 400);
  await startCustomerSession(r.customerId);
  return NextResponse.json({ ok: true, isNew: r.isNew });
}
