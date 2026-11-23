// One-time login codes. Only an HMAC of (phone, code) is stored, so a database leak does not reveal codes.
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_AFTER_MS = 30_000;

export const generateOtp = (): string => String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');

export const hashOtp = (secret: string, phone: string, code: string): string =>
  createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');

export function otpMatches(secret: string, phone: string, code: string, storedHash: string): boolean {
  if (!/^[0-9]{6}$/.test(code)) return false;
  const a = Buffer.from(hashOtp(secret, phone, code), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
