// Coupon rules (pure, unit-tested). Money in paise. Discounts apply to goods only, never to delivery.
export type CouponRule = {
  code: string;
  kind: 'PERCENT' | 'FLAT';
  value: number; // PERCENT: whole percent. FLAT: paise
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

export type CouponResult = { ok: true; discountPaise: number } | { ok: false; reason: string };

export const normalizeCouponCode = (code: string): string => code.trim().toUpperCase().replace(/\s+/g, '');
export const isValidCouponCode = (code: string): boolean => /^[A-Z0-9_-]{3,24}$/.test(code);

export function evaluateCoupon(c: CouponRule, goodsTotalPaise: number, now = new Date()): CouponResult {
  if (!c.isActive) return { ok: false, reason: 'This coupon is not active.' };
  if (c.startsAt && now < c.startsAt) return { ok: false, reason: 'This coupon is not valid yet.' };
  if (c.endsAt && now > c.endsAt) return { ok: false, reason: 'This coupon has expired.' };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { ok: false, reason: 'This coupon has been fully used.' };
  if (goodsTotalPaise < c.minOrderPaise) {
    return { ok: false, reason: `Add items worth ₹${Math.ceil((c.minOrderPaise - goodsTotalPaise) / 100).toLocaleString('en-IN')} more to use this coupon.` };
  }
  let d = c.kind === 'PERCENT' ? Math.floor((goodsTotalPaise * c.value) / 100) : c.value;
  if (c.kind === 'PERCENT' && c.maxDiscountPaise !== null) d = Math.min(d, c.maxDiscountPaise);
  d = Math.max(0, Math.min(d, goodsTotalPaise - 100)); // never make goods free: keep at least ₹1
  if (d === 0) return { ok: false, reason: 'This coupon gives no discount on this cart.' };
  return { ok: true, discountPaise: d };
}

/**
 * Split an order-level discount across lines in proportion to their value (largest remainder method),
 * so GST can be recalculated per line on the discounted amount. The parts always add up exactly.
 */
export function allocateDiscount(lineTotals: number[], discountPaise: number): number[] {
  const total = lineTotals.reduce((s, v) => s + v, 0);
  if (discountPaise <= 0 || total <= 0) return lineTotals.map(() => 0);
  if (discountPaise > total) throw new Error('discount larger than goods total');
  const exact = lineTotals.map((v) => (v * discountPaise) / total);
  const parts = exact.map(Math.floor);
  let left = discountPaise - parts.reduce((s, v) => s + v, 0);
  const order = exact.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left === 0) break;
    if (parts[i] < lineTotals[i]) { parts[i] += 1; left -= 1; }
  }
  return parts;
}
