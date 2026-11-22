import test from 'node:test';
import assert from 'node:assert/strict';
import { formatINR, discountPercent, toPaise } from '../../src/lib/money.ts';
import { splitInclusive, sumSplits, taxTypeFor } from '../../src/lib/tax.ts';

test('toPaise rounds correctly', () => {
  assert.equal(toPaise(1999.99), 199999);
  assert.equal(toPaise(0.1 + 0.2), 30);
});

test('formatINR uses Indian grouping and hides .00', () => {
  assert.match(formatINR(4599900), /45,999/);
  assert.ok(!formatINR(4599900).includes('.'));
  assert.match(formatINR(4599950), /45,999\.50/);
});

test('discountPercent', () => {
  assert.equal(discountPercent(10000, 7500), 25);
  assert.equal(discountPercent(10000, 10000), 0);
  assert.equal(discountPercent(0, 100), 0);
});

test('taxTypeFor: same state is INTRA, different is INTER (case-insensitive)', () => {
  assert.equal(taxTypeFor('RJ', 'rj'), 'INTRA');
  assert.equal(taxTypeFor('RJ', 'TS'), 'INTER');
});

test('splitInclusive 18% inter-state', () => {
  const s = splitInclusive(11800, 18, 'INTER');
  assert.deepEqual(s, { gross: 11800, taxable: 10000, tax: 1800, cgst: 0, sgst: 0, igst: 1800 });
});

test('splitInclusive 18% intra-state splits CGST/SGST evenly', () => {
  const s = splitInclusive(11800, 18, 'INTRA');
  assert.equal(s.cgst, 900);
  assert.equal(s.sgst, 900);
  assert.equal(s.igst, 0);
});

test('invariants hold for many amounts and rates (taxable+tax=gross, cgst+sgst=tax)', () => {
  for (const rate of [0, 5, 12, 18, 28]) {
    for (let gross = 0; gross <= 200000; gross += 777) {
      for (const type of ['INTRA', 'INTER'] as const) {
        const s = splitInclusive(gross, rate, type);
        assert.equal(s.taxable + s.tax, gross);
        assert.equal(s.cgst + s.sgst + s.igst, s.tax);
        assert.ok(s.taxable >= 0 && s.tax >= 0);
        if (type === 'INTRA') assert.ok(Math.abs(s.cgst - s.sgst) <= 1);
      }
    }
  }
});

test('splitInclusive rejects bad input', () => {
  assert.throws(() => splitInclusive(10.5, 18, 'INTER'));
  assert.throws(() => splitInclusive(-1, 18, 'INTER'));
  assert.throws(() => splitInclusive(100, 150, 'INTER'));
});

test('sumSplits adds components', () => {
  const a = splitInclusive(11800, 18, 'INTER');
  const b = splitInclusive(5900, 18, 'INTER');
  const t = sumSplits([a, b]);
  assert.equal(t.gross, 17700);
  assert.equal(t.igst, 2700);
});
