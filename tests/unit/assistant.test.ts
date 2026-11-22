import test from 'node:test';
import assert from 'node:assert/strict';
import { matchFaq, extractPincode, redactPII, clampMessage } from '../../src/lib/ai/rules.ts';
import { answer, type AssistantDeps } from '../../src/lib/ai/assistant.ts';
import type { Provider } from '../../src/lib/ai/provider.ts';

test('matchFaq finds the right topic', () => {
  assert.equal(matchFaq('How do I pay with UPI?')?.id, 'payment');
  assert.equal(matchFaq('what is your return policy')?.id, 'returns');
  assert.equal(matchFaq('is it sheesham wood')?.id, 'material');
  assert.equal(matchFaq('do you give gst bill')?.id, 'gst');
  assert.equal(matchFaq('qwertyuiop'), null);
});

test('extractPincode', () => {
  assert.equal(extractPincode('deliver to 500081 please'), '500081');
  assert.equal(extractPincode('order 12345678'), null);
  assert.equal(extractPincode('no pin here'), null);
  assert.equal(extractPincode('012345'), null);
});

test('redactPII removes phone, email and secrets', () => {
  const t = redactPII('call me on 9876543210 or +91 98765 43210, mail ram@example.com, my otp is 123456');
  assert.ok(!/9876543210|98765 43210|ram@example/.test(t));
  assert.ok(!t.includes('123456'));
  assert.ok(t.includes('[phone]') && t.includes('[email]') && t.includes('[secret]'));
});

test('redactPII keeps a plain pincode and product words', () => {
  assert.equal(redactPII('king size bed to 500081'), 'king size bed to 500081');
});

test('clampMessage limits length', () => {
  assert.equal(clampMessage('x'.repeat(2000)).length, 500);
});

const baseDeps = (providers: Provider[]): AssistantDeps => ({
  providers,
  searchProducts: async (q) => (/bed/i.test(q) ? [{ slug: 'bed', name: 'Sheesham King Bed', fromPricePaise: 4_000_000, category: 'Beds', inStock: true }] : []),
  pincodeInfo: (p) => (p === '500001' ? { serviceable: true, minDays: 7, maxDays: 12 } : null),
});

test('FAQ-only question does not call the LLM (saves free quota)', async () => {
  let calls = 0;
  const p: Provider = { name: 'x', generate: async () => { calls++; return 'ai'; } };
  const r = await answer([{ role: 'user', content: 'How can I pay by UPI?' }], baseDeps([p]));
  assert.equal(calls, 0);
  assert.equal(r.mode, 'rules');
  assert.match(r.reply, /UPI/);
});

test('product question goes to the LLM with redacted input and store facts', async () => {
  let seen = '';
  const p: Provider = { name: 'x', generate: async ({ messages }) => { seen = messages[messages.length - 1].content; return 'AI says hi'; } };
  const r = await answer([{ role: 'user', content: 'need a king bed, my number is 9876543210' }], baseDeps([p]));
  assert.equal(r.mode, 'ai');
  assert.equal(r.reply, 'AI says hi');
  assert.ok(!seen.includes('9876543210'));
  assert.match(seen, /Sheesham King Bed/);
  assert.equal(r.products.length, 1);
});

test('falls back to the second provider, then to rules', async () => {
  const bad: Provider = { name: 'bad', generate: async () => { throw new Error('429'); } };
  const good: Provider = { name: 'good', generate: async () => 'second ok' };
  const r1 = await answer([{ role: 'user', content: 'show me a bed' }], baseDeps([bad, good]));
  assert.equal(r1.reply, 'second ok');
  const r2 = await answer([{ role: 'user', content: 'show me a bed' }], baseDeps([bad, bad]));
  assert.equal(r2.mode, 'rules');
  assert.equal(r2.products.length, 1);
});

test('pincode question answered by rules (no LLM needed) and uses real data', async () => {
  const r = await answer([{ role: 'user', content: 'do you deliver to 500001?' }], baseDeps([]));
  assert.match(r.reply, /7-12 days/);
});

test('handoff flag set when customer asks for a human', async () => {
  const r = await answer([{ role: 'user', content: 'I want to talk to a human' }], baseDeps([]));
  assert.ok(r.handoff);
});

test('rejects history that does not end with a user message', async () => {
  await assert.rejects(() => answer([{ role: 'assistant', content: 'hi' }], baseDeps([])));
});

import { rankProducts } from '../../src/lib/ai/rules.ts';

const CATALOG = [
  { name: 'Sheesham King Size Bed', category: 'Beds', shortDesc: 'Solid wood bed with storage' },
  { name: 'Three Seater Sofa', category: 'Sofas', shortDesc: 'Wooden frame sofa' },
  { name: 'Six Seater Dining Set', category: 'Dining Sets', shortDesc: 'Table and chairs' },
];

test('rankProducts matches names, categories and synonyms', () => {
  assert.equal(rankProducts('king bed', CATALOG)[0].name, 'Sheesham King Size Bed');
  assert.equal(rankProducts('I need a cot', CATALOG)[0].category, 'Beds');
  assert.equal(rankProducts('couch for hall', CATALOG)[0].category, 'Sofas');
  assert.equal(rankProducts('dining table for 6', CATALOG)[0].category, 'Dining Sets');
  assert.deepEqual(rankProducts('hello there', CATALOG), []);
  assert.equal(rankProducts('beds', CATALOG).length, 1);
});
