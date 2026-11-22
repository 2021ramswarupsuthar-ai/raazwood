import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutSchema, quoteSchema, verifySchema, variantFormSchema, productFormSchema } from '../../src/lib/validators.ts';

const good = {
  items: [{ variantId: 'abc', qty: 2 }],
  customer: { name: 'Ram Kumar', phone: '9876543210', email: 'ram@example.com' },
  address: { line1: '12 MG Road', city: 'Hyderabad', stateCode: 'TS', pincode: '500001' },
};

test('checkoutSchema accepts a valid order', () => {
  assert.ok(checkoutSchema.safeParse(good).success);
  assert.ok(checkoutSchema.safeParse({ ...good, customer: { ...good.customer, email: '' } }).success);
  assert.ok(checkoutSchema.safeParse({ ...good, customer: { ...good.customer, phone: '+91 98765 43210' } }).success);
});

test('checkoutSchema rejects bad input', () => {
  const bad = (over: object) => assert.ok(!checkoutSchema.safeParse({ ...good, ...over }).success);
  bad({ items: [] });
  bad({ items: [{ variantId: 'a', qty: 0 }] });
  bad({ items: [{ variantId: 'a', qty: 21 }] });
  bad({ items: [{ variantId: 'a', qty: 1.5 }] });
  bad({ customer: { ...good.customer, phone: '12345' } });
  bad({ customer: { ...good.customer, name: 'A' } });
  bad({ address: { ...good.address, pincode: '012345' } });
  bad({ address: { ...good.address, stateCode: 'XX' } });
});

test('client-supplied prices are ignored by the schema (server prices from DB)', () => {
  const r = checkoutSchema.safeParse({ ...good, items: [{ variantId: 'abc', qty: 1, pricePaise: 1 }] });
  assert.ok(r.success);
  assert.ok(!('pricePaise' in r.data.items[0]));
});

test('quoteSchema and verifySchema', () => {
  assert.ok(quoteSchema.safeParse({ items: good.items, stateCode: 'KA', pincode: '560001' }).success);
  assert.ok(!quoteSchema.safeParse({ items: good.items, stateCode: 'ZZ', pincode: '560001' }).success);
  assert.ok(verifySchema.safeParse({ publicId: 'abcdefghijkl', razorpay_order_id: 'order_123456', razorpay_payment_id: 'pay_123456', razorpay_signature: 'x'.repeat(64) }).success);
  assert.ok(!verifySchema.safeParse({ publicId: 'a' }).success);
});

test('variantFormSchema coerces numbers and validates', () => {
  const ok = variantFormSchema.safeParse({ sku: 'BED-K', label: 'King', packQty: '1', mrpRupees: '55000', priceRupees: '42000', stock: '5', shippingRupees: '3000' });
  assert.ok(ok.success);
  assert.ok(!variantFormSchema.safeParse({ sku: 'B', label: '', packQty: 0, mrpRupees: 0, priceRupees: 1, stock: -1, shippingRupees: 0 }).success);
});

test('productFormSchema slug rules', () => {
  const base = { name: 'King Bed', slug: 'king-bed', categoryId: 'c1', shortDesc: '', description: '', material: 'Sheesham', finish: '', dimensions: '', hsn: '9403', gstRate: 18, isActive: true, isFeatured: false };
  assert.ok(productFormSchema.safeParse(base).success);
  assert.ok(!productFormSchema.safeParse({ ...base, slug: 'King Bed' }).success);
  assert.ok(!productFormSchema.safeParse({ ...base, hsn: 'abc' }).success);
  assert.ok(!productFormSchema.safeParse({ ...base, gstRate: 40 }).success);
});
