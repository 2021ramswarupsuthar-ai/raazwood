import { NextResponse } from 'next/server';
import { normalizeIndianMobile } from '@/lib/phone';
import { requestOtp } from '@/server/otp-service';
import { clientIp, jsonError, limiters, tooMany } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = limiters.otpSend.check(clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfterMs);
  const body = (await req.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = typeof body?.phone === 'string' ? normalizeIndianMobile(body.phone) : null;
  if (!phone) return jsonError('Enter a valid 10-digit Indian mobile number.');
  const r = await requestOtp(phone);
  if (!r.ok) return jsonError(r.error, r.status, r.retryAfterMs ? { retryAfterMs: r.retryAfterMs } : {});
  return NextResponse.json({ ok: true, phone, ...(r.devCode ? { devCode: r.devCode } : {}) });
}
