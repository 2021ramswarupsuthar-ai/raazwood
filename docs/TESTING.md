# Testing report and test plan

Date of this report: 21 Nov 2026. Environment used: sandbox with Node 22, TypeScript, esbuild, headless Chromium. **No internet, so `npm install`, `next build`, Prisma, Postgres, Razorpay and Gemini were NOT available.**

## 1. What was actually run (results)

| Check | Result |
|---|---|
| Unit tests (`npm test`, node:test): money, GST split invariants (thousands of amounts x 5 rates x intra/inter), pricing/shipping, pincode to state, Razorpay signatures (payment + webhook, tamper cases), order status machine, invoice FY numbering, rate limiter, validators, SEO JSON-LD, assistant (FAQ matching, PII redaction, provider fallback chain, no-LLM path, ranking) | **53 / 53 pass** |
| TypeScript strict type-check of `src/lib`, `src/config` and unit tests | **Pass** (Next/Prisma-dependent files could not be type-checked here) |
| Syntax/transpile check of every `.ts`/`.tsx` file (78 files) with esbuild | **Pass** |
| Visual check in headless Chromium: 3D table hero at top view, mid-scroll and front view on desktop (1280x800) and phone (390x844); intro logo pieces assembled | **Pass after fixes** |

### Bugs found by this testing and fixed
1. Phone numbers typed with spaces (`98765 43210`, `+91 98765 43210`) were rejected at checkout. Fixed in `validators.ts`, covered by a test.
2. The logo engraved on the table was stretched (missing `h-auto` on a Next `<Image>`). Fixed.
3. On phones the 3D table was off-centre and cut off (wide element inside a grid). Fixed with absolute centring.
4. Table legs overlapped the hero text on desktop. Table shifted up and legs shortened.

## 2. NOT run yet: you must run these before launch

1. `npm install && npm run typecheck && npm run lint && npm run build` (fix any type error: some are likely in files that could not be compiled here).
2. `npx prisma migrate dev --name init`, `npm run db:seed`, then `npm run test:e2e` (Playwright: SEO tags, robots/sitemap, cart, GST for Telangana (IGST) and Rajasthan (CGST+SGST), admin redirect, API abuse cases, assistant without AI key).
3. **Razorpay TEST mode, manual UAT** (checklist below).
4. Lighthouse on mobile for `/`, a product page and checkout: targets LCP < 2.5s, CLS < 0.1, INP < 200ms, SEO >= 95, Accessibility >= 90. If the hero costs too much on a mid-range Android phone, shorten it or switch to the static fallback.
5. Real-device check of the scroll hero (iPhone Safari and a mid-range Android): pinning, smoothness, address bar resize.
6. Assistant with a real free Gemini key: product question, pincode question, Hinglish question, injection attempt ("ignore your rules"), and check no phone number reaches the provider.

## 3. Manual UAT checklist (Razorpay test mode)

- [ ] UPI success: order becomes **Paid**, invoice number appears, stock reduced once
- [ ] UPI failure / user closes the window: order stays pending, "Pay now" retries the same order, stock released after 30 min (or run `/api/cron/expire-orders` with the secret)
- [ ] Money debited but browser closed before redirect: webhook marks the order Paid
- [ ] Webhook sent twice: no duplicate invoice or stock change
- [ ] Tamper: change the amount in the browser; server still charges the DB price
- [ ] Two customers buy the last piece at the same time: one succeeds, one gets "out of stock"
- [ ] Late payment after expiry: order marked Paid with a LATE PAYMENT note if stock is gone
- [ ] Rajasthan address shows CGST+SGST; Telangana/Karnataka/Tamil Nadu/Kerala show IGST; invoice matches
- [ ] "Set of 2" listing prices, stock and delivery charge independently
- [ ] Admin: login, wrong password, rate limit after 8 tries, add product + variant, change order status, cancel pending order restocks
- [ ] Reduced-motion setting on: no pinned hero, no intro
- [ ] Google Rich Results Test on a product page; Search Console sitemap submitted
- [ ] Policies (shipping, returns, privacy, terms) filled in and reviewed; GSTIN, address, phone, WhatsApp set in env

## 4. Known limitations / risks
- Pincode to state mapping is approximate; the customer-selected state is the tax authority.
- In-memory rate limits and assistant daily cap are per serverless instance (best effort).
- `SAMPLE` products and delivery-day estimates are placeholders.
- Free AI tier terms/limits change; confirm commercial use and that provider data use is acceptable (the privacy page already tells customers).
- Vercel Hobby is for non-commercial use: a business store likely needs the paid plan.
- Invoice layout is a working draft: have your CA confirm HSN, rates and invoice format.
