import test from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter } from '../../src/lib/rate-limit.ts';

test('allows up to max then blocks, per key', () => {
  const l = createLimiter({ windowMs: 1000, max: 3 });
  assert.ok(l.check('a', 0).ok && l.check('a', 1).ok && l.check('a', 2).ok);
  const blocked = l.check('a', 3);
  assert.ok(!blocked.ok);
  assert.ok(blocked.retryAfterMs > 0);
  assert.ok(l.check('b', 3).ok);
});

test('window slides', () => {
  const l = createLimiter({ windowMs: 1000, max: 1 });
  assert.ok(l.check('a', 0).ok);
  assert.ok(!l.check('a', 500).ok);
  assert.ok(l.check('a', 1001).ok);
});
