import test from 'node:test';
import assert from 'node:assert/strict';
import { STATES, stateByCode } from '../../src/config/states.ts';
import { CITIES } from '../../src/config/cities.ts';
import { SOUTH_STATES, STORE } from '../../src/config/store.ts';
import { productJsonLd, breadcrumbJsonLd, faqJsonLd, abs, organizationJsonLd } from '../../src/lib/seo.ts';

test('state table: unique codes and GST codes, Rajasthan = 08', () => {
  assert.equal(new Set(STATES.map((s) => s.code)).size, STATES.length);
  assert.equal(new Set(STATES.map((s) => s.gst)).size, STATES.length);
  assert.equal(stateByCode('rj')?.gst, '08');
  assert.equal(stateByCode('TS')?.gst, '36');
  assert.equal(stateByCode('AP')?.gst, '37');
  assert.equal(stateByCode('KA')?.gst, '29');
});

test('every city and south state refers to a real state; seller state exists', () => {
  for (const c of CITIES) assert.ok(stateByCode(c.stateCode), c.slug);
  for (const s of SOUTH_STATES) assert.ok(stateByCode(s), s);
  assert.ok(stateByCode(STORE.sellerStateCode));
  assert.equal(new Set(CITIES.map((c) => c.slug)).size, CITIES.length);
});

const base = { name: 'King Bed', slug: 'king-bed', description: 'Solid bed', images: ['/img/a.png', 'https://cdn.example/b.png'], sku: 'K1', material: 'Sheesham', inStock: true };

test('Product JSON-LD: single price uses Offer, range uses AggregateOffer, INR, absolute image URLs', () => {
  const one = productJsonLd({ ...base, lowPaise: 4200000, highPaise: 4200000 }) as any;
  assert.equal(one.offers['@type'], 'Offer');
  assert.equal(one.offers.price, '42000.00');
  assert.equal(one.offers.priceCurrency, 'INR');
  assert.ok(one.image.every((u: string) => u.startsWith('http')));
  const many = productJsonLd({ ...base, lowPaise: 3700000, highPaise: 4200000, inStock: false }) as any;
  assert.equal(many.offers['@type'], 'AggregateOffer');
  assert.equal(many.offers.lowPrice, '37000.00');
  assert.match(many.offers.availability, /OutOfStock/);
});

test('Breadcrumb / FAQ / Organization JSON-LD', () => {
  const b = breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Beds', path: '/c/beds' }]) as any;
  assert.deepEqual(b.itemListElement.map((i: any) => i.position), [1, 2]);
  assert.equal(b.itemListElement[1].item, abs('/c/beds'));
  const f = faqJsonLd([{ q: 'Q?', a: 'A.' }]) as any;
  assert.equal(f.mainEntity[0].acceptedAnswer.text, 'A.');
  assert.equal((organizationJsonLd() as any)['@type'], 'FurnitureStore');
});
