import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanMarketplaceUrl } from '../../src/lib/marketplaces.ts';

test('accepts real links for each platform and forces https', () => {
  assert.equal(cleanMarketplaceUrl('AMAZON', 'https://www.amazon.in/dp/B0CJASGHM'), 'https://www.amazon.in/dp/B0CJASGHM');
  assert.equal(cleanMarketplaceUrl('AMAZON', 'amzn.to/3abc'), 'https://amzn.to/3abc');
  assert.equal(cleanMarketplaceUrl('AMAZON', 'https://link.amazon/B0cjasghm'), 'https://link.amazon/B0cjasghm');
  assert.equal(cleanMarketplaceUrl('FLIPKART', 'http://dl.flipkart.com/s/xyz'), 'https://dl.flipkart.com/s/xyz');
  assert.equal(cleanMarketplaceUrl('MEESHO', 'https://www.meesho.com/bed/p/123'), 'https://www.meesho.com/bed/p/123');
});

test('rejects wrong platform, look-alike and unsafe addresses', () => {
  assert.equal(cleanMarketplaceUrl('AMAZON', 'https://www.flipkart.com/x'), null);
  assert.equal(cleanMarketplaceUrl('AMAZON', 'https://amazon.in.evil.com/dp/1'), null);
  assert.equal(cleanMarketplaceUrl('AMAZON', 'https://notamazon.in/dp/1'), null);
  assert.equal(cleanMarketplaceUrl('FLIPKART', 'javascript:alert(1)'), null);
  assert.equal(cleanMarketplaceUrl('MEESHO', 'https://user:pw@meesho.com/x'), null);
  assert.equal(cleanMarketplaceUrl('MEESHO', ''), null);
  assert.equal(cleanMarketplaceUrl('AMAZON', 'not a url'), null);
});
