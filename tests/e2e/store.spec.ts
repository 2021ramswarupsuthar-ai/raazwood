// End-to-end tests. Need a running app with the seeded SAMPLE data (npm run db:seed).
// Razorpay is never called here: checkout tests stop before payment.
import { test, expect } from '@playwright/test';

// Answer the cookie banner up front so it never covers buttons in the tests.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('rw_consent_v1', 'essential'); } catch { /* ignore */ } });
});

test.describe('SEO basics', () => {
  test('home has title, description, canonical, h1 and JSON-LD', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Raazwood/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /sheesham/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join(' ')).toContain('FurnitureStore');
  });

  test('robots.txt blocks private areas and lists the sitemap', async ({ request }) => {
    const r = await (await request.get('/robots.txt')).text();
    expect(r).toMatch(/Disallow: \/admin/);
    expect(r).toMatch(/Disallow: \/checkout/);
    expect(r).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });

  test('sitemap lists products and city pages', async ({ request }) => {
    const x = await (await request.get('/sitemap.xml')).text();
    expect(x).toContain('/product/');
    expect(x).toContain('/furniture-in/hyderabad');
  });

  test('cart and checkout are noindex', async ({ page }) => {
    for (const path of ['/cart', '/checkout']) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    }
  });

  test('product page has Product JSON-LD with INR price', async ({ page }) => {
    await page.goto('/product/sample-sheesham-king-bed');
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('"@type":"Product"');
    expect(ld).toContain('INR');
    await expect(page.locator('h1')).toContainText(/bed/i);
  });

  test('unknown product returns 404', async ({ request }) => {
    expect((await request.get('/product/does-not-exist')).status()).toBe(404);
  });
});

test.describe('Shopping flow', () => {
  test('intro can be skipped and hero text is in the DOM', async ({ page }) => {
    await page.goto('/');
    const skip = page.getByRole('button', { name: 'Skip' });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await expect(page.locator('#intro')).toBeHidden({ timeout: 5000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/sheesham/i);
  });

  test('add to cart, change quantity, see totals', async ({ page }) => {
    await page.goto('/product/sample-sheesham-king-bed');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.goto('/cart');
    await expect(page.getByText('SAMPLE Sheesham King Size Bed')).toBeVisible();
    await page.getByRole('button', { name: /Increase quantity/ }).click();
    // the product page preselects the cheapest in-stock size: Queen at ₹37,000, so 2 x = ₹74,000
    await expect(page.getByText('₹74,000').first()).toBeVisible();
  });

  test('checkout shows server-calculated delivery and GST for a Telangana pincode', async ({ page }) => {
    await page.goto('/product/sample-sheesham-king-bed');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.goto('/checkout');
    await page.getByLabel('Pincode').fill('500001');
    await expect(page.getByLabel('State')).toHaveValue('TS');
    await expect(page.getByText(/IGST/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Pay .* by UPI/ })).toBeEnabled();
  });

  test('Rajasthan pincode is intra-state (CGST + SGST)', async ({ page }) => {
    await page.goto('/product/sample-sheesham-king-bed');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.goto('/checkout');
    await page.getByLabel('Pincode').fill('302001');
    await expect(page.getByText(/CGST \+ SGST/)).toBeVisible({ timeout: 10_000 });
  });

  test('pincode checker on product page', async ({ page }) => {
    await page.goto('/product/sample-sheesham-king-bed');
    await page.getByLabel('Delivery pincode').fill('560001');
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByRole('status').filter({ hasText: /Karnataka/ })).toBeVisible();
  });
});

test.describe('Security', () => {
  test('admin redirects to login when signed out', async ({ page }) => {
    await page.goto('/admin/products');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('checkout API rejects a tampered price (server decides prices)', async ({ request }) => {
    const r = await request.post('/api/checkout/create', { data: { items: [{ variantId: 'x', qty: 1, pricePaise: 1 }], customer: { name: 'A', phone: '1' }, address: {} } });
    expect([400, 409, 503]).toContain(r.status());
  });

  test('webhook rejects an unsigned request', async ({ request }) => {
    const r = await request.post('/api/webhooks/razorpay', { data: { event: 'payment.captured' } });
    expect([400, 503]).toContain(r.status());
  });

  test('cron endpoint needs the secret', async ({ request }) => {
    expect((await request.get('/api/cron/expire-orders')).status()).toBe(401);
  });
});

test.describe('README MVP features', () => {
  test('FAQ page has FAQPage JSON-LD', async ({ page }) => {
    await page.goto('/faq');
    await expect(page.locator('h1')).toContainText(/questions/i);
    expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ')).toContain('FAQPage');
  });

  test('blog lists guides and an article has Article JSON-LD', async ({ page }) => {
    await page.goto('/blog');
    await page.getByRole('link', { name: /bed size/i }).first().click();
    await expect(page).toHaveURL(/\/blog\//);
    expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ')).toContain('"@type":"Article"');
  });

  test('account pages need login and keep the return path', async ({ page }) => {
    await page.goto('/account/orders');
    await expect(page).toHaveURL(/\/account\/login\?next=%2Faccount%2Forders/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('wishlist and reviews need a logged-in customer', async ({ request }) => {
    expect((await request.post('/api/wishlist', { data: { productId: 'x' } })).status()).toBe(401);
    expect((await request.post('/api/reviews', { data: { productId: 'x', rating: 5, title: 'Nice', body: 'Very good bed' } })).status()).toBe(401);
  });

  test('search suggestions find products', async ({ request }) => {
    const j = await (await request.get('/api/search/suggest?q=bed')).json();
    expect(j.items.some((i: { slug: string }) => i.slug === 'sample-sheesham-king-bed')).toBeTruthy();
  });

  test('price filter narrows the shop and filtered pages are noindex', async ({ page }) => {
    await page.goto('/shop?max=5000');
    await expect(page.getByText('SAMPLE Wooden Stool')).toBeVisible();
    await expect(page.getByText('SAMPLE Sheesham King Size Bed')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('SAMPLE10 coupon is applied at checkout (10%, capped at Rs 2,000)', async ({ page }) => {
    await page.goto('/product/sample-sheesham-king-bed');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.goto('/checkout');
    await page.getByLabel('Pincode').fill('500001');
    await expect(page.getByText(/IGST/)).toBeVisible({ timeout: 10_000 });
    await page.getByLabel('Coupon code').fill('sample10');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('Coupon discount')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('−₹2,000')).toBeVisible();
  });

  test('an unknown coupon shows an error', async ({ page }) => {
    await page.goto('/product/sample-sheesham-king-bed');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.goto('/checkout');
    await page.getByLabel('Pincode').fill('500001');
    await page.getByLabel('Coupon code').fill('NOPE123');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('This coupon code is not valid.')).toBeVisible({ timeout: 10_000 });
  });

  test('manual UPI order: QR on the order page, then UTR is accepted', async ({ page }) => {
    test.skip(!process.env.UPI_VPA, 'set UPI_VPA (manual UPI mode) to run this test');
    await page.goto('/product/sample-sheesham-stool');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.goto('/checkout');
    await page.getByLabel('Full name').fill('E2E Test');
    await page.getByLabel('Mobile number').fill('9876543210');
    await page.getByLabel('Address', { exact: true }).fill('12 Test Street, Banjara Hills');
    await page.getByLabel('Pincode').fill('500034');
    await page.getByLabel('City').fill('Hyderabad');
    await page.getByRole('button', { name: /Pay .* by UPI/ }).click();
    await expect(page).toHaveURL(/\/order\//, { timeout: 15_000 });
    await expect(page.getByAltText(/UPI QR code/)).toBeVisible();
    await page.getByLabel(/UTR/).fill(String(Date.now()).slice(-12).padStart(12, '4'));
    await page.getByRole('button', { name: 'I have paid' }).click();
    await expect(page.getByText(/checking your payment/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Assistant', () => {
  test('answers FAQ questions without any AI key (rule-based mode)', async ({ request }) => {
    const r = await request.post('/api/assistant', { data: { messages: [{ role: 'user', content: 'How can I pay?' }] } });
    expect(r.ok()).toBeTruthy();
    const j = await r.json();
    expect(j.reply).toMatch(/UPI/);
  });

  test('delivery answer uses the pincode', async ({ request }) => {
    const r = await request.post('/api/assistant', { data: { messages: [{ role: 'user', content: 'Do you deliver to 500001?' }] } });
    expect((await r.json()).reply).toMatch(/deliver/i);
  });
});
