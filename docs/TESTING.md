# Testing report and test plan

Latest run: **23 Nov 2026**, Windows, Node 24, PostgreSQL 16 in Docker (`npm run db:up`), `npm run dev`.

## 1. What was actually run (results)

| Check | Result |
|---|---|
| `npm run typecheck` (whole project, strict) | **Pass** |
| `npm run lint` | **Pass** (no warnings) |
| Unit tests (`npm test`, node:test): money, GST split invariants, pricing/shipping, **coupon rules and discount allocation (GST on the discounted value)**, pincode to state, Razorpay signatures, order status machine, invoice FY numbering, rate limiter, validators, SEO JSON-LD, assistant, **phone normalisation, OTP hashing, CSV escaping / formula injection, UPI link and UTR checks, blog text format** | **65 / 65 pass** |
| `npm run build` (production) | **Pass** (29 pages) |
| `prisma migrate diff` committed migrations vs `schema.prisma` | **No difference** |
| Playwright e2e (`E2E_BASE_URL=http://localhost:3000 UPI_VPA=… npx playwright test`) against the dev server, desktop + mobile (Pixel 7) | **52 / 52 pass** |
| Manual walk-through in a browser (below) | **Pass** |

Manual walk-through done on localhost:
- OTP login with the development code, wrong code shows attempts left, new customer lands on the profile page; profile saved.
- Wishlist heart on a product, review submitted (pending), approved in admin, shown on the product page with AggregateRating JSON-LD.
- Checkout as a logged-in customer: name/phone pre-filled, address saved to the account, `SAMPLE10` coupon (₹6,800 − ₹680 + ₹800 delivery = ₹6,920; IGST ₹1,055.59 on the discounted value).
- Manual UPI: QR + UPI ID on the order page, UTR submitted, admin confirmed → Paid, invoice `RW/2026-27/000001`, confirmation printed as dev SMS/WhatsApp; Processing → Shipped sends the shipped message.
- Invoice shows the coupon per line (taxable ₹5,186.44 + IGST ₹933.56 = ₹6,120).
- Admin: dashboard alerts (UPI to verify, reviews waiting), payments reconciliation (difference ₹0), coupon usage count, audit log entries, CSV export (orders, products), delivery zone change reflected in `/api/pincode`.
- A cart item whose product was deleted is now removed at checkout with a notice (before: checkout was stuck on "Some items in your cart are no longer available").

### Bugs found by this testing and fixed
1. README quick start could not work: `prisma migrate dev` does not read `.env.local`, there were no committed migrations (so `migrate deploy` created no tables), `npx prisma db seed` had no seed config and the `lighthouse` script did not exist. Fixed with `db:*` scripts (dotenv-cli), an `init` migration and a corrected README.
2. Tailwind generated no utility classes when the dev server was started from another folder (`content` glob resolved from the working directory). Fixed with `relative: true`.
3. React hydration warning on every page (the intro script sets `data-intro` on `<html>` before hydration). Fixed with `suppressHydrationWarning` on `<html>` only.
4. Stale cart items blocked checkout with no way out (see above). Fixed.
5. e2e test "add to cart, change quantity" expected the King price, but the page preselects the cheapest in-stock size (Queen). Test corrected.

## 2. NOT run yet: you must run these before launch
1. **Razorpay TEST mode, manual UAT** (checklist below).
2. Lighthouse on mobile for `/`, a product page and checkout: targets LCP < 2.5s, CLS < 0.1, INP < 200ms, SEO >= 95, Accessibility >= 90. If the hero costs too much on a mid-range Android phone, shorten it or switch to the static fallback.
3. Real-device check of the scroll hero (iPhone Safari and a mid-range Android): pinning, smoothness, address bar resize.
4. Assistant with a real free Gemini key: product question, pincode question, Hinglish question, injection attempt ("ignore your rules"), and check no phone number reaches the provider.

5. **CI on GitHub**: push a branch and check the workflow (it runs migrations, seed, unit tests, the migration drift check and Playwright against a production build).
6. **Real messages**: MSG91 DLT OTP template (login), optional MSG91 Flow, Resend domain + `EMAIL_FROM`, WhatsApp Cloud API approved template. Check each message arrives and reads well.

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
- [ ] Customer login by SMS on a real phone; logout; login again shows earlier guest orders placed with the same number
- [ ] Coupon: expired / not started / usage limit reached / below minimum all show a clear message; usage count goes up only for paid orders
- [ ] Manual UPI (if used): pay a real ₹1-₹10 test order to your VPA, match the UTR in your bank app, confirm in admin; a wrong UTR can be rejected and re-sent
- [ ] Order status changes send SMS / WhatsApp / email; cancelled and refunded messages read correctly
- [ ] Reviews: approve, reject, delete; only approved ones appear; rich results test shows the rating
- [ ] Delivery zones: block a state, check product pincode checker, checkout and assistant all agree
- [ ] CSV exports open correctly in Excel (₹ and names, no formulas)
- [ ] Remove the SAMPLE products, the SAMPLE10 coupon and the SAMPLE guides

## 4. Known limitations / risks
- Pincode to state mapping is approximate; the customer-selected state is the tax authority.
- In-memory rate limits and assistant daily cap are per serverless instance (best effort).
- `SAMPLE` products, the `SAMPLE10` coupon, the two SAMPLE guides and the delivery-day estimates are placeholders.
- In development without an SMS provider the login code is shown on the page; production refuses OTP login until MSG91 is configured.
- Free AI tier terms/limits change; confirm commercial use and that provider data use is acceptable (the privacy page already tells customers).
- Vercel Hobby is for non-commercial use: a business store likely needs the paid plan.
- Invoice layout is a working draft: have your CA confirm HSN, rates and invoice format.
