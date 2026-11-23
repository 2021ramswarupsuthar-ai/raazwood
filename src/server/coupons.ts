import 'server-only';
import { prisma } from './db';
import { evaluateCoupon, isValidCouponCode, normalizeCouponCode } from '@/lib/coupon';

export type AppliedCoupon = { code: string; discountPaise: number } | { code: string; error: string };

export async function applyCoupon(rawCode: string | undefined | null, goodsTotalPaise: number): Promise<AppliedCoupon | null> {
  if (!rawCode) return null;
  const code = normalizeCouponCode(rawCode);
  if (!code) return null;
  if (!isValidCouponCode(code)) return { code, error: 'This coupon code is not valid.' };
  const c = await prisma.coupon.findUnique({ where: { code } });
  if (!c) return { code, error: 'This coupon code is not valid.' };
  const r = evaluateCoupon(c, goodsTotalPaise);
  return r.ok ? { code, discountPaise: r.discountPaise } : { code, error: r.reason };
}
