import test from 'node:test';
import assert from 'node:assert/strict';
import { calcTotals } from '../../src/lib/pricing.ts';

const line = (over = {}) => ({ variantId: 'v1', pricePaise: 4_000_000, qty: 1, gstRate: 18, shippingPaise: 250_000, ...over });

test('inter-state order: IGST only, total = goods + shipping', () => {
  const t = calcTotals({ lines: [line()], sellerStateCode: 'RJ', deliveryStateCode: 'TS' });
  assert.equal(t.taxType, 'INTER');
  assert.equal(t.goodsTotal, 4_000_000);
  assert.equal(t.shipping, 250_000);
  assert.equal(t.total, 4_250_000);
  assert.equal(t.tax.cgst + t.tax.sgst, 0);
  assert.equal(t.tax.igst, t.tax.tax);
  assert.equal(t.tax.taxable + t.tax.tax, t.total);
});

test('intra-state order (Rajasthan to Rajasthan): CGST+SGST', () => {
  const t = calcTotals({ lines: [line()], sellerStateCode: 'RJ', deliveryStateCode: 'RJ' });
  assert.equal(t.taxType, 'INTRA');
  assert.equal(t.tax.igst, 0);
  assert.equal(t.tax.cgst + t.tax.sgst, t.tax.tax);
});

test('quantity multiplies price and shipping', () => {
  const t = calcTotals({ lines: [line({ qty: 3 })], sellerStateCode: 'RJ', deliveryStateCode: 'KA' });
  assert.equal(t.goodsTotal, 12_000_000);
  assert.equal(t.shipping, 750_000);
});

test('free shipping threshold', () => {
  const t = calcTotals({ lines: [line()], sellerStateCode: 'RJ', deliveryStateCode: 'KA', freeShippingAbovePaise: 3_000_000 });
  assert.equal(t.shipping, 0);
  assert.equal(t.total, 4_000_000);
});

test('mixed GST rates: shipping taxed at the highest rate, totals still reconcile', () => {
  const t = calcTotals({
    lines: [line({ gstRate: 12, variantId: 'a' }), line({ gstRate: 18, variantId: 'b', pricePaise: 1_000_000 })],
    sellerStateCode: 'RJ',
    deliveryStateCode: 'TN',
  });
  assert.equal(t.tax.taxable + t.tax.tax, t.total);
});

test('rejects empty cart and bad quantity', () => {
  assert.throws(() => calcTotals({ lines: [], sellerStateCode: 'RJ', deliveryStateCode: 'TS' }));
  assert.throws(() => calcTotals({ lines: [line({ qty: 0 })], sellerStateCode: 'RJ', deliveryStateCode: 'TS' }));
  assert.throws(() => calcTotals({ lines: [line({ qty: 1.5 })], sellerStateCode: 'RJ', deliveryStateCode: 'TS' }));
});
