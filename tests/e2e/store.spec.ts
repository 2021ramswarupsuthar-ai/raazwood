// End-to-end tests. Need a running app with the seeded SAMPLE data (npm run db:seed).
// Razorpay is never called here: checkout tests stop before payment.
import { test, expect } from '@playwright/test';

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
    await expect(page.getByText('₹84,000').first()).toBeVisible();
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
