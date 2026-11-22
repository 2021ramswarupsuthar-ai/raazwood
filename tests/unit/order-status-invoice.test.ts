import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, allowedNext, isPaidStatus } from '../../src/lib/order-status.ts';
import { financialYear, formatInvoiceNo } from '../../src/lib/invoice.ts';
import { slugify } from '../../src/lib/seo.ts';

test('order status transitions', () => {
  assert.ok(canTransition('PAID', 'PROCESSING'));
  assert.ok(canTransition('PROCESSING', 'SHIPPED'));
  assert.ok(canTransition('SHIPPED', 'DELIVERED'));
  assert.ok(!canTransition('PENDING_PAYMENT', 'SHIPPED'));
  assert.ok(!canTransition('DELIVERED', 'PROCESSING'));
  assert.deepEqual(allowedNext('EXPIRED'), []);
  assert.ok(isPaidStatus('SHIPPED') && !isPaidStatus('PENDING_PAYMENT'));
});

test('financial year boundaries (April to March)', () => {
  assert.equal(financialYear(new Date(2026, 2, 31)), '2025-26'); // 31 Mar 2026
  assert.equal(financialYear(new Date(2026, 3, 1)), '2026-27'); // 1 Apr 2026
  assert.equal(financialYear(new Date(2026, 10, 21)), '2026-27');
  assert.equal(financialYear(new Date(2026, 0, 5)), '2025-26');
});

test('invoice number format', () => {
  assert.equal(formatInvoiceNo('RW', new Date(2026, 10, 21), 123), 'RW/2026-27/000123');
});

test('slugify', () => {
  assert.equal(slugify('Sheesham King-Size Bed (6x6.5 ft)!'), 'sheesham-king-size-bed-6x6-5-ft');
});
