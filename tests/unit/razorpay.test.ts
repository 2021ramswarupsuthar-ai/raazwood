import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyPaymentSignature, verifyWebhookSignature, createRazorpayOrder } from '../../src/lib/razorpay.ts';

const h = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('hex');

test('verifyPaymentSignature accepts a valid signature', () => {
  const sig = h('secret', 'order_1|pay_1');
  assert.ok(verifyPaymentSignature('order_1', 'pay_1', sig, 'secret'));
});

test('verifyPaymentSignature rejects tampering', () => {
  const sig = h('secret', 'order_1|pay_1');
  assert.ok(!verifyPaymentSignature('order_1', 'pay_2', sig, 'secret'));
  assert.ok(!verifyPaymentSignature('order_2', 'pay_1', sig, 'secret'));
  assert.ok(!verifyPaymentSignature('order_1', 'pay_1', sig, 'other-secret'));
  assert.ok(!verifyPaymentSignature('order_1', 'pay_1', 'short', 'secret'));
  assert.ok(!verifyPaymentSignature('order_1', 'pay_1', '', 'secret'));
});

test('verifyWebhookSignature uses the raw body', () => {
  const body = '{"event":"payment.captured","payload":{}}';
  const sig = h('whsec', body);
  assert.ok(verifyWebhookSignature(body, sig, 'whsec'));
  assert.ok(!verifyWebhookSignature(body + ' ', sig, 'whsec')); // whitespace changes the body
  assert.ok(!verifyWebhookSignature(body, sig, 'wrong'));
});

test('createRazorpayOrder sends amount in paise with basic auth', async () => {
  let captured: { url: string; init: RequestInit } | null = null;
  const fake: typeof fetch = async (url, init) => {
    captured = { url: String(url), init: init! };
    return new Response(JSON.stringify({ id: 'order_X', amount: 12345, currency: 'INR', receipt: 'r1', status: 'created' }), { status: 200 });
  };
  const o = await createRazorpayOrder({ amountPaise: 12345, receipt: 'r1', keyId: 'k', keySecret: 's', fetchImpl: fake });
  assert.equal(o.id, 'order_X');
  assert.equal(captured!.url, 'https://api.razorpay.com/v1/orders');
  const body = JSON.parse(String(captured!.init.body));
  assert.equal(body.amount, 12345);
  assert.equal(body.currency, 'INR');
  assert.equal((captured!.init.headers as Record<string, string>).Authorization, 'Basic ' + Buffer.from('k:s').toString('base64'));
});

test('createRazorpayOrder throws on API error', async () => {
  const fake: typeof fetch = async () => new Response('bad', { status: 400 });
  await assert.rejects(() => createRazorpayOrder({ amountPaise: 1, receipt: 'r', keyId: 'k', keySecret: 's', fetchImpl: fake }));
});
