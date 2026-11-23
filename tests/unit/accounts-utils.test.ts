import test from 'node:test';
import assert from 'node:assert/strict';
import { maskPhone, normalizeIndianMobile } from '../../src/lib/phone.ts';
import { generateOtp, hashOtp, otpMatches } from '../../src/lib/otp.ts';
import { csvCell, toCsv } from '../../src/lib/csv.ts';
import { isValidUtr, isValidVpa, normalizeUtr, upiPayLink } from '../../src/lib/upi.ts';
import { parseBlocks, readingMinutes } from '../../src/lib/richtext.ts';

test('normalizeIndianMobile accepts common formats and rejects others', () => {
  for (const s of ['9876543210', '98765 43210', '+91 98765-43210', '919876543210', '09876543210']) assert.equal(normalizeIndianMobile(s), '9876543210');
  for (const s of ['5876543210', '987654321', '98765432100', 'abcdefghij', '']) assert.equal(normalizeIndianMobile(s), null);
  assert.equal(maskPhone('9876543210'), '98XXXXXX10');
});

test('OTP: 6 digits, only the matching code for the same phone passes', () => {
  for (let i = 0; i < 200; i++) assert.match(generateOtp(), /^[0-9]{6}$/);
  const h = hashOtp('secret-secret', '9876543210', '012345');
  assert.ok(otpMatches('secret-secret', '9876543210', '012345', h));
  assert.ok(!otpMatches('secret-secret', '9876543210', '012346', h));
  assert.ok(!otpMatches('secret-secret', '9876543211', '012345', h));
  assert.ok(!otpMatches('other-secret', '9876543210', '012345', h));
  assert.ok(!otpMatches('secret-secret', '9876543210', '12345', h));
});

test('CSV escapes quotes/commas/newlines and blocks formula injection', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+91 98765'), "'+91 98765");
  assert.equal(csvCell(-5), '-5'); // real numbers are not touched
  assert.equal(csvCell(null), '');
  const out = toCsv(['a', 'b'], [[1, 'x\ny']]);
  assert.ok(out.startsWith('﻿a,b\r\n1,"x\ny"'));
});

test('UPI link and UTR checks', () => {
  assert.ok(isValidVpa('krishanaart@okhdfcbank'));
  assert.ok(!isValidVpa('not a vpa'));
  const link = upiPayLink({ vpa: 'shop@upi', payeeName: 'Krishana Art Palace', amountPaise: 760000, note: 'Raazwood order', ref: 'abc123' });
  assert.ok(link.startsWith('upi://pay?pa=shop%40upi&pn=Krishana%20Art%20Palace&am=7600.00&cu=INR'));
  assert.equal(normalizeUtr(' 4123 5678-9012 '), '412356789012');
  assert.ok(isValidUtr('412356789012'));
  assert.ok(!isValidUtr('12345'));
});

test('blog text format: headings, paragraphs and bullet lists, never HTML', () => {
  const b = parseBlocks('## Why sheesham\nIt is strong.\nAnd beautiful.\n\n- Dense grain\n- Long life\n\n<script>x</script>');
  assert.deepEqual(b, [
    { type: 'h2', text: 'Why sheesham' },
    { type: 'p', text: 'It is strong. And beautiful.' },
    { type: 'ul', items: ['Dense grain', 'Long life'] },
    { type: 'p', text: '<script>x</script>' }, // rendered as text by React, so it is harmless
  ]);
  assert.equal(readingMinutes('word '.repeat(450)), 2);
});
