import test from 'node:test';
import assert from 'node:assert/strict';
import { guessStateFromPincode, isValidPincode, isSouthState, deliveryWindow, isServiceable } from '../../src/lib/pincode.ts';

test('isValidPincode', () => {
  assert.ok(isValidPincode('500001'));
  assert.ok(!isValidPincode('050001'));
  assert.ok(!isValidPincode('5000011'));
  assert.ok(!isValidPincode('50000a'));
  assert.ok(!isValidPincode(''));
});

test('guessStateFromPincode for well-known pincodes', () => {
  const cases: [string, string][] = [
    ['500001', 'TS'], // Hyderabad
    ['530001', 'AP'], // Visakhapatnam
    ['560001', 'KA'], // Bengaluru
    ['600001', 'TN'], // Chennai
    ['682001', 'KL'], // Kochi
    ['695001', 'KL'], // Thiruvananthapuram
    ['641001', 'TN'], // Coimbatore
    ['302001', 'RJ'], // Jaipur
    ['110001', 'DL'],
    ['400001', 'MH'],
    ['403001', 'GA'],
    ['605001', 'PY'],
    ['248001', 'UK'],
    ['834001', 'JH'],
    ['800001', 'BR'],
  ];
  for (const [pin, st] of cases) assert.equal(guessStateFromPincode(pin), st, pin);
});

test('guessStateFromPincode returns null for invalid/unknown', () => {
  assert.equal(guessStateFromPincode('000000'), null);
  assert.equal(guessStateFromPincode('abc'), null);
  assert.equal(guessStateFromPincode('790001'), null);
});

test('south zone + delivery window', () => {
  assert.ok(isSouthState('TS') && isSouthState('KL'));
  assert.ok(!isSouthState('RJ'));
  const w = deliveryWindow('TN');
  assert.ok(w.min > 0 && w.max >= w.min);
});

test('serviceable by default (all states incl. Rajasthan)', () => {
  assert.ok(isServiceable('RJ'));
  assert.ok(isServiceable('TS'));
});
