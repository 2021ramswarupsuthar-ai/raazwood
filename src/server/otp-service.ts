import 'server-only';
import { prisma } from './db';
import { sendOtpSms, smsConfigured } from './messaging';
import { customerSecret } from '@/lib/auth-token';
import { generateOtp, hashOtp, otpMatches, OTP_MAX_ATTEMPTS, OTP_RESEND_AFTER_MS, OTP_TTL_MS } from '@/lib/otp';

export type OtpRequestResult =
  | { ok: true; devCode?: string }
  | { ok: false; error: string; retryAfterMs?: number; status: number };

const MAX_PER_HOUR = 5;

/**
 * Sends a login code. Limits: one code per 30 s and 5 per hour per phone (on top of the per-IP limiter in the
 * route). In development without an SMS provider the code is printed to the server console and also returned
 * so the login page can show it; production refuses to log anyone in without a real SMS provider.
 */
export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !smsConfigured()) return { ok: false, status: 503, error: 'Login by OTP is not available yet. You can still check out as a guest.' };

  const now = Date.now();
  const recent = await prisma.otpCode.findMany({ where: { phone, createdAt: { gte: new Date(now - 3_600_000) } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
  if (recent[0] && now - recent[0].createdAt.getTime() < OTP_RESEND_AFTER_MS) {
    return { ok: false, status: 429, error: 'Please wait a few seconds before asking for another code.', retryAfterMs: OTP_RESEND_AFTER_MS - (now - recent[0].createdAt.getTime()) };
  }
  if (recent.length >= MAX_PER_HOUR) return { ok: false, status: 429, error: 'Too many codes requested. Please try again in an hour.' };

  const code = generateOtp();
  // a new code replaces any older unused one
  await prisma.otpCode.updateMany({ where: { phone, usedAt: null }, data: { usedAt: new Date(now) } });
  await prisma.otpCode.create({ data: { phone, codeHash: hashOtp(customerSecret(), phone, code), expiresAt: new Date(now + OTP_TTL_MS) } });
  await prisma.otpCode.deleteMany({ where: { createdAt: { lt: new Date(now - 7 * 86_400_000) } } }); // housekeeping

  const sent = await sendOtpSms(phone, code);
  if (!sent && isProd) return { ok: false, status: 502, error: 'Could not send the SMS. Please try again in a minute.' };
  return sent ? { ok: true } : { ok: true, devCode: code };
}

export type OtpVerifyResult = { ok: true; customerId: string; isNew: boolean } | { ok: false; error: string };

export async function verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
  const otp = await prisma.otpCode.findFirst({ where: { phone, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!otp) return { ok: false, error: 'This code has expired. Please request a new one.' };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: 'Too many wrong attempts. Please request a new code.' };

  if (!otpMatches(customerSecret(), phone, code, otp.codeHash)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    return { ok: false, error: left > 0 ? `Wrong code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Please request a new code.' };
  }
  // single use: only the request that flips usedAt wins
  const claimed = await prisma.otpCode.updateMany({ where: { id: otp.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) return { ok: false, error: 'This code was already used. Please request a new one.' };

  const existing = await prisma.customer.findUnique({ where: { phone } });
  const customer = existing
    ? await prisma.customer.update({ where: { id: existing.id }, data: { lastLoginAt: new Date() } })
    : await prisma.customer.create({ data: { phone, lastLoginAt: new Date() } });
  // The phone is now proven, so earlier guest orders placed with it belong to this account.
  await prisma.order.updateMany({ where: { phone, customerId: null }, data: { customerId: customer.id } });
  return { ok: true, customerId: customer.id, isNew: !existing };
}
