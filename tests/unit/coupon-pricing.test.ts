import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateDiscount, evaluateCoupon, isValidCouponCode, normalizeCouponCode, type CouponRule } from '../../src/lib/coupon.ts';
import { calcTotals } from '../../src/lib/pricing.ts';

const base: CouponRule = { code: 'WELCOME10', kind: 'PERCENT', value: 10, minOrderPaise: 0, maxDiscountPaise: null, startsAt: null, endsAt: null, usageLimit: null, usedCount: 0, isActive: true };

test('coupon codes are normalised and validated', () => {
  assert.equal(normalizeCouponCode(' welcome 10 '), 'WELCOME10');
  assert.ok(isValidCouponCode('DIWALI-500'));
  assert.ok(!isValidCouponCode('a'));
  assert.ok(!isValidCouponCode('BAD CODE'));
});

test('percent coupon with cap', () => {
  assert.deepEqual(evaluateCoupon(base, 1_000_000), { ok: true, discountPaise: 100_000 });
  assert.deepEqual(evaluateCoupon({ ...base, maxDiscountPaise: 50_000 }, 1_000_000), { ok: true, discountPaise: 50_000 });
});

test('flat coupon never exceeds goods (keeps at least ₹1)', () => {
  assert.deepEqual(evaluateCoupon({ ...base, kind: 'FLAT', value: 200_000 }, 500_000), { ok: true, discountPaise: 200_000 });
  assert.deepEqual(evaluateCoupon({ ...base, kind: 'FLAT', value: 900_000 }, 500_000), { ok: true, discountPaise: 499_900 });
});

test('coupon rejection reasons', () => {
  const now = new Date('2026-11-23T10:00:00Z');
  assert.equal(evaluateCoupon({ ...base, isActive: false }, 1_000_000, now).ok, false);
  assert.equal(evaluateCoupon({ ...base, startsAt: new Date('2026-12-01') }, 1_000_000, now).ok, false);
  assert.equal(evaluateCoupon({ ...base, endsAt: new Date('2026-11-01') }, 1_000_000, now).ok, false);
  assert.equal(evaluateCoupon({ ...base, usageLimit: 5, usedCount: 5 }, 1_000_000, now).ok, false);
  const r = evaluateCoupon({ ...base, minOrderPaise: 2_000_000 }, 1_000_000, now);
  assert.equal(r.ok, false);
  assert.match((r as { reason: string }).reason, /10,000 more/);
});

test('allocateDiscount splits exactly and proportionally', () => {
  for (const [lines, d] of [[[100, 100, 100], 100], [[4_200_000, 680_000, 330_000], 123_457], [[1, 1, 1, 1, 1, 1, 1], 3], [[999], 998]] as [number[], number][]) {
    const parts = allocateDiscount(lines, d);
    assert.equal(parts.reduce((s, v) => s + v, 0), d);
    parts.forEach((p, i) => assert.ok(p >= 0 && p <= lines[i]));
  }
  assert.deepEqual(allocateDiscount([500, 500], 0), [0, 0]);
  assert.throws(() => allocateDiscount([100], 200));
});

test('discount lowers GST: tax is recomputed on the discounted value', () => {
  const lines = [{ variantId: 'a', pricePaise: 4_200_000, qty: 1, gstRate: 18, shippingPaise: 300_000 }, { variantId: 'b', pricePaise: 680_000, qty: 2, gstRate: 18, shippingPaise: 80_000 }];
  const plain = calcTotals({ lines, sellerStateCode: 'RJ', deliveryStateCode: 'TS' });
  const disc = calcTotals({ lines, sellerStateCode: 'RJ', deliveryStateCode: 'TS', discountPaise: 556_000 });
  assert.equal(disc.goodsTotal, plain.goodsTotal);
  assert.equal(disc.discount, 556_000);
  assert.equal(disc.total, plain.total - 556_000);
  assert.ok(disc.tax.tax < plain.tax.tax);
  assert.equal(disc.tax.taxable + disc.tax.tax, disc.total); // invariant still holds
  assert.equal(disc.lines.reduce((s, l) => s + l.discount, 0), 556_000);
});

test('extra zone shipping is added once; free-shipping threshold uses the discounted goods value', () => {
  const lines = [{ variantId: 'a', pricePaise: 1_000_000, qty: 1, gstRate: 18, shippingPaise: 50_000 }];
  assert.equal(calcTotals({ lines, sellerStateCode: 'RJ', deliveryStateCode: 'KA', extraShippingPaise: 20_000 }).shipping, 70_000);
  assert.equal(calcTotals({ lines, sellerStateCode: 'RJ', deliveryStateCode: 'KA', freeShippingAbovePaise: 1_000_000 }).shipping, 0);
  assert.equal(calcTotals({ lines, sellerStateCode: 'RJ', deliveryStateCode: 'KA', freeShippingAbovePaise: 1_000_000, discountPaise: 1 }).shipping, 50_000);
});
