import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_HERO, cleanHeroLink, effectiveMode, normalizeHero } from '../../src/lib/hero.ts';

test('hero links: site paths and https only', () => {
  assert.equal(cleanHeroLink('/c/beds'), '/c/beds');
  assert.equal(cleanHeroLink(''), '');
  assert.equal(cleanHeroLink('https://example.com/sale'), 'https://example.com/sale');
  for (const bad of ['javascript:alert(1)', '//evil.com', '/\\evil.com', 'http://example.com', 'ftp://x.com', 'https://u:p@x.com', 'data:text/html,hi']) assert.equal(cleanHeroLink(bad), null, bad);
});

test('settings are always complete and safe', () => {
  assert.deepEqual(normalizeHero(undefined), DEFAULT_HERO);
  assert.deepEqual(normalizeHero('junk'), DEFAULT_HERO);
  const h = normalizeHero({ mode: 'BANNER', headline: '  Diwali sale  ', ctaHref: 'javascript:alert(1)', ctaLabel: 'x'.repeat(100) });
  assert.equal(h.mode, 'BANNER');
  assert.equal(h.headline, 'Diwali sale');
  assert.equal(h.ctaHref, DEFAULT_HERO.ctaHref); // unsafe link replaced
  assert.equal(h.ctaLabel.length, 30);
  assert.equal(normalizeHero({ mode: 'HACK' }).mode, 'TABLE');
});

test('photo/banner mode without active slides falls back to the table', () => {
  assert.equal(effectiveMode('PRODUCTS', 0), 'TABLE');
  assert.equal(effectiveMode('BANNER', 0), 'TABLE');
  assert.equal(effectiveMode('BANNER', 2), 'BANNER');
  assert.equal(effectiveMode('TABLE', 0), 'TABLE');
});
