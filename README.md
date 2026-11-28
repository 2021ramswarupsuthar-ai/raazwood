# Raazwood: E-commerce Website (Krishana Art Palace)

> **Code status (26 Nov 2026): MVP from Sprints 0-5 is built, with a redesigned storefront and admin, and runs end-to-end on a local PostgreSQL database.** Typecheck, lint, 70 unit tests, 52 e2e runs (26 tests x desktop/mobile) and `next build` pass. Not yet tried with real Razorpay / MSG91 / Resend / WhatsApp accounts. See [Implementation status](#implementation-status) and `docs/TESTING.md` before deploying.

> **Planned redesign (28 Nov 2026):** the homepage header becomes a **hero with two modes, switchable in admin: (1) promotional banners and (2) a 3D product showcase** (4-5 products in a thumbnail strip at the bottom; the selected product rotates in 3D above and the products alternate automatically). The rest of the storefront moves to a modern, current design and tech approach instead of a classic template look. See [§3A.2](#3a2-hero-section-banner-mode-and-3d-product-showcase-mode) and [§3D](#3d-storefront-redesign-modern-professional-and-conversion-focused-planned). **Not built yet.**

> **Planned additions (benchmark of 5 competitor furniture sites, 26 Nov 2026):** see [§3C](#3c-benchmark-additions-planned). **Not built yet.** Payment methods (cards / net banking / EMI) and an installation service or installation field are intentionally **not** part of this list.

## Quick start (on your computer)

Requirements: **Node.js 22.18+** and **PostgreSQL** (Docker Desktop for the local database below, or a free Neon database).

```bash
npm install
cp .env.example .env.local        # fill ADMIN_JWT_SECRET (openssl rand -base64 48), ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD
npm run db:up                     # local Postgres 16 in Docker on port 5433 (skip if you use Neon: put its URLs in .env.local)
npm run db:migrate                # applies prisma/migrations to the database in .env.local
npm run db:seed                   # categories, SAMPLE products, SAMPLE10 coupon, 2 SAMPLE guides, admin user
npm run dev                       # http://localhost:3000   (admin: /admin, customer account: /account)
```

Checks: `npm test` (unit, no database needed) · `npm run typecheck` · `npm run lint` · `npm run build` · `npm run test:e2e` (Playwright, needs the seeded database).

All `db:*` scripts read `.env.local` (then `.env`) through `dotenv-cli`, because the Prisma CLI on its own only reads `.env`. After changing `prisma/schema.prisma`, run `npm run db:migrate -- --name <what-changed>` and commit the new folder in `prisma/migrations`.

**Trying it locally without any accounts**
- **Customer login:** with no SMS provider configured, `npm run dev` prints the one-time code in the terminal **and** shows it on the login page (development only; production refuses OTP login until MSG91 is set up).
- **Payment:** with no Razorpay keys, set `UPI_VPA=anything@upi` in `.env.local` to use the manual UPI flow: the order page shows a QR code, you type any 12-digit number as the UTR, then confirm it in Admin > Orders. With Razorpay **test** keys the Razorpay window opens instead.
- **Coupon:** `SAMPLE10` gives 10% off (max ₹2,000) on goods above ₹5,000.
- **Contact details:** set `NEXT_PUBLIC_PHONE` and `NEXT_PUBLIC_WHATSAPP` in `.env.local` (and later in Vercel).
- **Optional storefront text:** `NEXT_PUBLIC_OFFER_BANNER`, `NEXT_PUBLIC_WARRANTY_TEXT`, `NEXT_PUBLIC_RETURNS_TEXT` show the announcement bar / warranty / returns lines. They are empty by default so the site never promises something the owner has not decided.
- **Homepage hero:** Admin > Homepage hero (today: table animation, product photos or banner; planned: banner mode or 3D product showcase mode, see §3A.2).
- **Messages:** order confirmations and status updates are printed in the terminal until Resend / MSG91 / WhatsApp are configured.

Razorpay (test mode first): put test keys in `.env.local`, then in Razorpay Dashboard add a webhook to `https://<your-domain>/api/webhooks/razorpay` with events `payment.captured`, `order.paid`, `payment.failed` and copy its secret to `RAZORPAY_WEBHOOK_SECRET`. For local testing expose localhost with a tunnel (ngrok / cloudflared).

**Deploy (Vercel):** push to GitHub, import into Vercel, add every variable from `.env.example` (production values). The `vercel-build` script runs `prisma migrate deploy` before `next build`, so new migrations are applied on each deploy. `vercel.json` schedules the daily `/api/cron/expire-orders` job (set `CRON_SECRET`).

## Implementation status

| Area | Status |
|---|---|
| Storefront: home, shop with filters (price, in stock), sorting and pagination, category pages, product, header search with suggestions, cart, checkout, order tracking, invoice | Built |
| Storefront design: announcement bar, trust strip, product cards with savings, product page with zoom gallery, delivery/returns/care accordions and mobile sticky buy bar, custom-size WhatsApp banner and latest guides on the home page, floating WhatsApp button | Built. Real product photos still needed (neutral placeholder until then) |
| Admin design: sidebar menu with pending counts, dashboard with 14-day sales chart, top products, recent orders and low stock, coloured status badges | Built |
| Customer accounts: phone OTP login (no password), profile, saved addresses, order history (earlier guest orders with the same phone are linked automatically), wishlist, checkout pre-fill. Guest checkout still allowed | Built. **Needs MSG91 DLT template for production SMS** |
| Reviews: logged-in customers, one per product, "Verified purchase" badge, admin approval, AggregateRating JSON-LD | Built |
| Coupons: percent (with cap) or flat, minimum order, dates, usage limit; GST recalculated on the discounted value; shown on invoice | Built, unit-tested |
| UPI payment via Razorpay (create order, client verify, signed webhook, idempotent, amount check, late-payment handling) | Built, **needs Razorpay test-mode run** |
| Manual UPI fallback (QR + `upi://` link, customer sends UTR, admin verifies, duplicate-UTR protection) | Built |
| Notifications: order confirmed / shipped / delivered / cancelled / refunded by email (Resend), SMS (MSG91 Flow) and WhatsApp (Cloud API template) | Built, **needs real accounts and approved templates** |
| GST: inclusive prices, CGST+SGST (Rajasthan) / IGST (other states), per-order invoice with FY numbering | Built, unit-tested. Rates/HSN to confirm with CA |
| Delivery zones per state (deliver / don't, delivery days, extra charge) editable in admin; pincode to state is approximate, the customer-chosen state decides tax | Built. Default delivery days in `src/config/store.ts` are **placeholders** |
| Stock reservation (30 min Razorpay / 24 h manual UPI), release of expired orders (lazy + daily cron) | Built, **needs DB integration test** |
| Admin: login, dashboard, products + variants ("Set of 2" via pack qty) + archive/restore, categories, orders + status flow + search, customers, coupons, reviews, blog, delivery zones, payments reconciliation (daily), CSV export (orders, products, customers), audit log | Built |
| Homepage hero controlled from Admin > Homepage hero: table animation (default), product photo animation (up to 6 photos) or promotional banners (clickable). Uploads are resized, cleaned and stored as WebP in two sizes (works on Vercel, no Cloudinary needed) | Built (old modes). **To be replaced by banner mode + 3D product showcase mode ([§3A.2](#3a2-hero-section-banner-mode-and-3d-product-showcase-mode)), planned, not built** |
| Also sold on Amazon / Flipkart / Meesho: per product checkbox + link in admin, links shown as "Also available on" on the product page (links checked against each platform's own domains) | Built |
| Content: blog / buying guides (Article JSON-LD), FAQ page (FAQPage JSON-LD), cookie consent (analytics only after consent) | Built. SAMPLE guides to replace |
| SEO: metadata, canonical, sitemap (products, categories, guides, city pages), robots, JSON-LD (Product + ratings, Breadcrumb, FAQ, Article, Organization), South India city pages, noindex on private and filtered pages | Built |
| Motion: intro logo animation (infinity into the two O's), scroll-driven table hero (top view to 3D front view), reveal animations, reduced-motion fallback | Built using pure CSS 3D + GSAP. The **logo intro (infinity) animation and the table hero are to be removed**; the table hero is replaced by the 3D product showcase (§3A.2). Real behaviour must be tried on a device |
| AI assistant v1: FAQ + product search + pincode answers (uses admin delivery zones), free Gemini tier + optional fallback provider, rule-based mode with no AI, PII redaction, rate/daily limits | Built (retrieval-then-answer, not a tool loop). **Needs real key test** |
| Static/legal pages (shipping, returns, privacy, terms) | **DRAFT templates with [placeholders]: owner and legal review required** |
| Tests: 70 unit tests (node:test), 26 Playwright e2e tests (desktop + mobile), CI workflow with migration drift check | Unit and e2e pass locally (26 Nov 2026). CI on GitHub **not yet run** |
| Benchmark additions ([§3C](#3c-benchmark-additions-planned)): per-product lead time, variant selectors with price per option, more filters, spec table, product image upload, warranty + return/damage claims, custom/bulk enquiry + Leads, offers display, notify-me, collections, cross-sell, per-product FAQ, review photos, newsletter, catalogue PDF, expert callback / video call | **Planned (not built)** |
| Storefront redesign ([§3D](#3d-storefront-redesign-modern-professional-and-conversion-focused-planned)): hero with banner mode + 3D product showcase mode, modern design system and tech upgrades, homepage structure, product card / product page / checkout polish, reach and tracking plan | **Planned (not built)** |
| Not built yet (later sprints) | Cards / net banking / COD, Shiprocket, abandoned-cart reminders, assistant v2 (chat logs, order tracking in chat, KB editor), product image upload (paste image URLs for now; hero/banner upload is built; planned in §3C.1), marketplace stock/price sync, strict CSP, Turnstile bot check, shared (Redis) rate limiting, Sentry, Lighthouse CI, regional languages, admin 2FA |

Brand assets in `public/brand` were cut from the supplied PNG logos. A true vector (SVG) logo is still recommended.

---

**by Krishana Art Palace** · Sheesham wood furniture · Online store (India)

> The sections below are the original project plan. Where the build differs from the plan, the section says so ("**As built:**").
> Domain: `raazwood.<tld>` (to be purchased) · Hosting: Vercel

---

## 1. Project Goals

1. A fast, mobile-first online store where customers can browse, search, add to cart and pay via **UPI**.
2. **SEO built in from day one** (not an afterthought) so products rank on Google.
3. Built in **sprints** — launch a solid MVP, then keep shipping updates.
4. Zero-cost (or near zero) infrastructure to start, with the ability to scale later.
5. Quality gates in every sprint: tests, accessibility, performance, security.

### Non-goals (for now)
- Cards / net banking / COD / EMI (later sprint, payment layer is built to allow this)
- Mobile app, multi-vendor marketplace, multi-language
- Expert installation service and an installation field: products ship **pre-assembled or self-assembly** only

---

## 1A. Confirmed Decisions (v2)

- **Payments:** UPI via **Razorpay** (gateway, webhook-verified). Manual UPI QR kept only as a fallback.
- **Market:** Pan-India delivery **including Rajasthan**. Primary audience / SEO focus: **South India** (Telangana, Andhra Pradesh, Karnataka, Tamil Nadu, Kerala). Serviceable states are controlled from admin via `DeliveryZone` (Admin > Delivery: per state deliver yes/no, delivery days, extra charge).
- **Catalogue size:** ~50 products, ~100 listings (single piece + "Set of 2" bundles). Hard cap ~100 for launch.
- **Tax:** GST-registered seller. Orders outside Rajasthan are interstate (**IGST**); orders within Rajasthan are intra-state (**CGST + SGST**). Tax type is decided automatically from the delivery state. Prices are shown **GST-inclusive**, and the system generates a tax invoice record for every order (needed for your accounts, Razorpay reconciliation and returns). Rates/HSN to be confirmed with your CA.
- **Brand:** Logo supplied (hexagon tree mark + RAAZWOOD wordmark), brand colour `#AB8D69`. See §1B.
- **Scale implication:** with only ~100 listings, no heavy search engine is needed. Postgres full-text search + category filters are enough. Most product pages can be statically generated (ISR), which is great for speed and SEO.
- **Bundles:** "Set of 2" modelled as a variant with `packQty = 2` (own SKU, price, stock, weight, shipping), with its own SEO page or a variant selector on the main product page. **As built:** variant selector on the product page.

---

## 1B. Brand & Logo Guidelines

**Assets received:** (1) hexagon tree icon, (2) horizontal logo = icon + RAAZWOOD wordmark. Both are high-resolution PNGs with transparent background.

**Brand colour:** `#AB8D69` (tan/wood). Suggested palette tokens:

| Token | Value | Use |
|---|---|---|
| `brand` | `#AB8D69` | Logo, accents, borders, large headings |
| `brand-dark` | `#7A5F3E` | Buttons, links, small text (passes WCAG AA on white) |
| `ink` | `#2B2118` | Body text |
| `cream` | `#FAF6F0` | Page / section backgrounds |
| `white` | `#FFFFFF` | Cards |

> `#AB8D69` on white has only ~3:1 contrast. Fine for the logo and large headings, **not** for small body text or button labels. Use `brand-dark` there.

**Asset checklist (to be produced in Sprint 0):**
- [ ] SVG versions of both logos (vector, crisp on all screens). Re-export from the original design file, or vectorise the PNGs
- [ ] Simplified favicon / app icon: solid hexagon with a bold, simplified tree (the thin branches disappear below ~48px). Sizes: 16, 32, 48, 180 (Apple touch), 192 and 512 (PWA)
- [ ] White (reversed) logo version for dark/photo backgrounds
- [ ] Social share image (1200x630) with logo for WhatsApp/Facebook previews (Open Graph)
- [ ] Optimised WebP/PNG for the header (about 40px tall mobile, 48-56px desktop)
- [ ] Logo used in `Organization` JSON-LD (`logo` field), invoices and emails
- Footer line: "Raazwood, a brand of Krishana Art Palace"
- Clear space around the logo is at least the height of the hexagon's top point; minimum width 120px for the horizontal logo

---

## 2. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (React) + TypeScript** | It *is* React, but gives server rendering, ISR, metadata API, sitemap — essential for SEO. A plain React SPA ranks poorly. |
| Backend / API | **Next.js Route Handlers + Server Actions (Node.js, TypeScript)** | Runs as Vercel serverless functions. One repo, one deploy, no separate server to pay for. Go/separate REST server is unnecessary at this scale. |
| Database | **PostgreSQL on Neon** (via Vercel Marketplace) | Free tier, real relational DB (orders, stock, payments need transactions). |
| ORM | **Prisma** (or Drizzle) | Type-safe queries, migrations. |
| Images | **Cloudinary** (free tier) or **Bunny.net Storage + CDN** | Auto resize/WebP/AVIF. **As built:** product images are pasted as URLs (Cloudinary allowed in `next.config.mjs`); homepage hero and banner images are uploaded in admin, resized with `sharp` to 2000/900 px WebP and stored in PostgreSQL (served from `/media/<id>`). |
| Auth | Planned: Auth.js. **As built:** small custom auth with `jose` JWT cookies. Customers: phone OTP (MSG91), hashed codes, 30-day session. Admin: email + bcrypt password, 12 h session (2FA later) | Indian users prefer mobile OTP. Guest checkout allowed. Fewer moving parts than Auth.js for one OTP flow. |
| Payments | **UPI** — see §6 | Razorpay (default) or manual UPI fallback, chosen by `PAYMENT_PROVIDER` / available keys (`src/server/payments-config.ts`). |
| Styling | **Tailwind CSS** (shadcn/ui not used: a handful of custom components was enough) | Fast, accessible components. |
| AI assistant | **Free-tier LLM API (default: Google Gemini API free tier)** behind a provider-agnostic adapter (`src/lib/ai/provider.ts`, plain `fetch`, no Vercel AI SDK). **As built:** retrieval-then-answer, no tool loop or streaming yet | Customer help chat grounded in live catalogue and policies, at zero cost to start. See §3B. |
| Animation / 3D | GSAP + ScrollTrigger (scroll reveals), Framer Motion (UI and page transitions), CSS View Transitions, `three.js` + `@react-three/fiber` + `drei` for the hero 3D product showcase only (lazy loaded, client-only), optional Lenis smooth scroll | Modern, smooth motion with a 3D hero, while the heavy 3D code loads only after first paint and only on capable devices. See §3A and §3D. |
| Validation | **Zod** | Shared schemas for client + server. |
| Email / SMS / WhatsApp | Resend (email), MSG91 (OTP + order SMS), WhatsApp Cloud API (order updates) | Order confirmation + status updates. All optional; without them development prints messages to the console (`src/server/messaging.ts`). |
| Monitoring | Vercel Analytics, Sentry (errors), Google Search Console, GA4 | **As built:** GA4 via `NEXT_PUBLIC_GA_ID`, loaded only after cookie consent. Sentry not added yet. |
| CI/CD | GitHub + GitHub Actions + Vercel preview deployments | Every PR gets a preview URL. |

> Free-tier limits change often. **Re-verify Neon / Vercel / Cloudinary / Bunny limits and Vercel's terms for commercial use before launch.** (Vercel's free Hobby plan is meant for non-commercial use; a business store may need the Pro plan — confirm in Sprint 0.)

---

## 3. Features

### 3.1 Customer-facing (MVP)
- Home page (hero, featured categories, bestsellers, trust badges)
- Category & sub-category pages (Beds, Sofas, Dining, Wardrobes, Tables, etc.)
- Product listing with filters (price, category, size, finish) + sorting + pagination
- Product detail page: image gallery/zoom, price, MRP, discount, dimensions, wood type, finish/colour variants, stock, delivery estimate, specs, FAQs, reviews
- Search with suggestions
- Cart (persistent), wishlist
- Checkout: address, pincode serviceability + shipping charge, order summary, **UPI payment**
- Guest checkout + optional account
- Order confirmation page, email/WhatsApp confirmation, order tracking page
- "Enquire on WhatsApp" button on products (custom size / bulk orders)
- Static pages: About, Contact, Shipping, Returns & Refund, Privacy, Terms, FAQ
- Blog / buying guides (SEO content)

**As built also:** "Also available on" Amazon / Flipkart / Meesho links per product, floating WhatsApp, trust strip and an optional offer bar.

### 3.2 Admin panel (MVP)
- Secure login
- Product CRUD (images, variants, stock, SEO title/description, slug)
- Category management
- Order management (status: Pending Payment → Paid → Processing → Shipped → Delivered / Cancelled / Refunded)
- Payment verification & reconciliation
- Customer list
- Coupons / discounts
- Basic dashboard (sales, orders, low stock)
- CSV export (orders, products)

**As built also:** homepage hero control with image upload, per-product marketplace links, delivery zones, audit log and a redesigned dashboard.

### 3.2A AI assistant (customer help)
Site-wide chat assistant for product advice, delivery/pincode, payment help, order tracking, policies and human handover. Full spec in §3B.

### 3.3 Later sprints (backlog)
Cards/net banking/COD · abandoned-cart reminders · shipping partner integration (Shiprocket etc.) · multi-warehouse · Hindi language · loyalty/referrals · Google Merchant Center feed · PWA.

Benchmark-driven additions (lead time, warranty and claims, custom/bulk enquiry, offers display and more) are planned in [§3C](#3c-benchmark-additions-planned).

---

## 3C. Benchmark additions (planned)

Source: a read of five competitor sites (Khaticraft, Sona Arts, Wooden Street, Insaraf, The Timber Guy), 26 Nov 2026, compared with this README. Everything below is **planned, not built**. Items marked *(owner decision)* need a business input from §13 before coding.

**Explicitly out of scope here:** payment methods (cards / net banking / EMI stay as in §1 and §3.3) and any installation service or installation field (products are pre-assembled or self-assembly, so no "Expert Assembly" option).

### 3C.1 Product & catalogue
- **Lead time per product.** `fulfilmentType` (`READY_TO_SHIP` / `MADE_TO_ORDER` / `CUSTOM`) plus `productionDaysMin/Max`. Shown on product card, product page, cart and checkout. Estimated delivery = production days + the state's delivery days from `DeliveryZone`. The order confirmation message repeats it as an estimate.
- **Variant selectors with price per option.** Product options (finish, size, storage type, wood) shown as selectors; each option shows its own price and switches gallery, SKU and stock without a full reload. Finish options use **swatch images**. Decide per option whether each combination gets its own URL (better SEO, needs canonicals) or a query parameter.
- **More filters.** Room, category, size, finish, storage type, seater count, wood, collection, plus the existing price and in-stock. Filtered URLs stay `noindex` as in §7.
- **Specification table on every product.** Dimensions in cm and inches, mattress size (beds), primary and secondary material, finish, pack content, SKU, weight (for freight), country of origin. Plus a short **natural-wood disclaimer** (grain, knots and shade vary; dimensions may differ slightly from the photos) *(owner decision: exact wording, tolerance)*.
- **Per-product FAQ** (editable in admin, `FAQPage` JSON-LD per product page).
- **Product image upload in admin.** Multiple images per product, drag to reorder, alt text, image type (main, angle, detail, dimension drawing, in-room look). Resized to WebP like the hero images. Replaces pasting image URLs.
- **Cross-sell.** "Frequently bought together" and "Complete your bedroom" blocks, chosen by the admin per product.
- **Collections and merchandising.** Design series (e.g. a named collection), flags for Bestseller and Featured, **New launches** (auto: added in the last 60 days), "Customer favourites". Homepage sections are driven from these.

### 3C.2 Pricing & offers display
- Show **"You pay ₹X with coupon"** on product cards and product page when a public or auto-applied coupon exists (uses the existing coupon engine, GST recalculated on the discounted value).
- An **Offers page** listing active public coupons with terms; the existing announcement bar can point to it.
- Honest pricing rules: MRP must be a price actually charged or listed before; a **sale countdown** only when the sale really ends at that time; no fake urgency. Have the wording reviewed (consumer-protection rules on misleading prices and dark patterns).

### 3C.3 Trust: warranty, returns and claims
- **Warranty page with real terms** (duration, what is covered, what is not, how to claim) *(owner decision)*. `NEXT_PUBLIC_WARRANTY_TEXT` shows the one-line summary and links to it.
- **Warranty claim flow:** order ID + phone OTP, description, photos or video. Creates a ticket in admin; the response-time promise is shown on the page.
- **Return / damage claim (RMA)** from the order page: customer reports within a configurable window after delivery (days set in `src/config/store.ts`) with photos and an optional unboxing-video link. Claim statuses: `REQUESTED` → `APPROVED` / `REJECTED` → `PICKUP_SCHEDULED` → `REFUNDED` / `REPLACED` / `REPAIRED`. Admin screen with notes, customer notifications on each change, linked to the existing Refunded order status. Eligible reasons and exclusions (e.g. change of mind, custom orders) are written in the Returns policy *(owner decision)*.
- **Cancellation window** configurable (e.g. before dispatch or within N hours) *(owner decision)*.
- **Merchant details** on the product page and footer: seller name, registered address, GSTIN (if registered), support phone/email, country of origin. **Grievance Redressal** page with officer name and email (E-Commerce Rules 2020).
- New policy pages: Warranty, Payment policy, Care guide, After-sales service. Refund deductions (if any, e.g. a gateway fee) must be stated in the Returns policy *(owner decision)*.

### 3C.4 Custom, bulk and lead capture
- **Custom furniture enquiry form:** product type, dimensions, finish, wood, quantity, budget, city/pincode, phone, reference photos (limited file types and size), consent checkbox. Creates a `Lead` of type `CUSTOM`.
- **Bulk / hotel / restaurant enquiry page** (`Lead` type `BULK`).
- **Talk to an expert:** callback request and video-call request with the working hours shown; WhatsApp link prefilled with the product link. Same `Lead` table (`CALLBACK`, `VIDEO_CALL`) and the same handoff target as the AI assistant (§3B).
- **Admin Leads inbox:** status (new, contacted, quoted, won, lost), notes, owner notified on WhatsApp/email. Custom orders show their own lead time ("after design approval, N days") *(owner decision)*.
- **Catalogue PDF download**, generated from active products (also useful to share on WhatsApp).
- **Newsletter signup** with consent (DPDP), unsubscribe link in every mail.

### 3C.5 Discovery & engagement
- **Search upgrades:** trending searches (admin-curated), recent searches, and a no-result state that suggests popular categories.
- **Recently viewed** and **guest wishlist** (kept in the browser, merged into the account after OTP login).
- **"Notify me" when back in stock** (phone or email, sent once when stock rises above zero).
- **Quick view** and **Add to cart** directly from product cards; **Buy Now** on the product page (goes straight to checkout).
- **Reviews:** photos, city and date shown with the "Verified purchase" badge (builds on the existing review system). A **Customer stories** page with permission. Do not copy reviews from Amazon / Flipkart / Meesho unless the platform's terms allow it.
- **About page** with real workshop/factory photos or a short video and only certifications that are really held.
- **Order lookup without login:** order ID + phone or email on the tracking page, in addition to `/account`.

### 3C.6 Physical presence (only if the business has a showroom or pickup point)
- Store / showroom page with map, hours and a visit-booking form.
- **Self-pickup** at checkout (pickup address, "ready in N days"), controlled by a flag in `DeliveryZone`/store config.

### 3C.7 Later
PWA, extra categories (mattresses, rugs, lamps), dealer / franchise page, international shipping page, product videos.

### 3C.8 Guardrails taken from the benchmark
- **No placeholder text in production.** CI scans the rendered pages and legal pages for leftovers (`[placeholder]`, `lorem`, "MyCompany", "Dynamic Snippet", empty template blocks) and fails the build.
- "Free delivery" or "free installation" wording is used only when it matches `DeliveryZone` charges and the real service (no installation is offered).
- Uploads (claims, custom enquiries): allowed types and size limits, virus/format checks where possible, Turnstile on public forms, and rate limits.
- Claim and lead photos are treated as personal data: stored privately, access only for admin, retention period stated in the Privacy Policy.

### 3C.9 Sprint mapping
| When | Items |
|---|---|
| **Sprint 6a (before launch)** | 3C.1 lead time, variant selectors, filters, spec table, image upload; 3C.3 warranty page, return/damage claims, merchant details, grievance page; 3C.4 custom and bulk enquiry + admin Leads; 3C.8 placeholder CI check |
| **Sprint 7** | 3C.1 per-product FAQ, cross-sell, collections; 3C.2 offers display and Offers page; 3C.4 expert callback / video call, catalogue PDF, newsletter; 3C.5 search upgrades, recently viewed, guest wishlist, notify-me, quick view / Buy Now, review photos, customer stories, About page, order lookup |
| **Sprint 8** | 3C.6 showroom / self-pickup (if applicable); 3C.7 later items |

Each item follows the Definition of Done in §8 (tests, accessibility, mobile, SEO, docs).

---

## 3D. Storefront redesign: modern, professional and conversion-focused (planned)

**Status:** planned, not built (28 Nov 2026). The functional requirements elsewhere in this README stay as they are; this section decides the look, the technology approach, the page structure and what keeps visitors on the site until they buy. The site must **not look like an old-style or template store**: it should feel current and premium, like a modern direct-to-consumer furniture brand. Visual details (spacing, exact fonts, layouts) are left to the designer / developer, within the rules below.

**Goal:** the site should look like an established furniture brand, make a first-time visitor trust it within a few seconds, show products quickly, and make buying (UPI) easy on a mid-range phone. It must also reach more people than the owner's existing contacts (see 3D.6).

### 3D.1 Design direction and modern tech
**Look and feel (modern, not classic template):**
- Warm, premium, editorial: cream backgrounds, wood-toned accents, large confident typography, generous white space, big full-bleed photography. Use the §1B tokens (`brand`, `brand-dark`, `ink`, `cream`); `brand-dark` for buttons and small text.
- Two typefaces at most through `next/font`: an expressive modern serif (or display face) for headings and a clean sans for body, prices and UI.
- Current layout patterns: **bento-style grids** for categories and features, large rounded cards, soft layered shadows, subtle glass / blur only on the sticky header and overlays, smooth scroll-reveal, sticky product galleries, horizontal swipe rails on mobile. No cluttered banners, no more than one primary CTA per section.
- Optional **dark-mode** aware tokens (cream/ink inverted) so the site respects the visitor's system theme; decide in Sprint 0 after checking brand colour contrast.
- Real photography (furnished rooms, grain and joinery close-ups, workshop) carries the design, with consistent image ratios and blur-up placeholders.
- One consistent component set: buttons, cards, badges, fields, toasts, skeleton loaders, empty states, with polished micro-interactions (hover, press, add-to-cart feedback).
- Mobile first (most visitors are on Android over 4G); desktop is the enhanced layout.
- Accessible by default (contrast, focus states, 44 px tap targets, WCAG 2.1 AA).

**Technology approach (current, but kept fast):**
- Latest stable **Next.js App Router** with React Server Components, streaming and **Partial Prerendering / ISR** where supported, so the page shell appears instantly and dynamic parts (price, stock, cart) stream in. Re-verify versions at build time.
- **Tailwind CSS** design tokens + a small in-house component library; **Framer Motion** for UI transitions, **CSS View Transitions** for page-to-page transitions, GSAP for scroll scenes.
- Hero 3D via `three.js` / `@react-three/fiber` (lazy) or 360 canvas frames (§3A.2).
- Optimistic UI for cart and wishlist, prefetching of likely next pages, `next/image` with AVIF/WebP, edge caching, font subsetting.
- **PWA** (installable, offline-friendly browsing of viewed products) moves up from the backlog to Sprint 7.
- Every upgrade must keep the budgets in §3A.5 (LCP < 2.5 s, INP < 200 ms, CLS < 0.1, Lighthouse mobile >= 90). If a visual effect breaks a budget, the effect is simplified.

### 3D.2 Homepage structure
Top to bottom (each block is a server component with real HTML text):
1. **Announcement bar** (real offer or delivery note only; optional, from `NEXT_PUBLIC_OFFER_BANNER`).
2. **Header:** logo, search with suggestions, account, wishlist, cart with count, category / room mega menu. Sticky and compact on scroll, with a subtle blur. The hero sits directly under it.
3. **Hero (two modes, switch in admin):** *Banner mode:* up to 6 clickable promotional banners with one clear headline and CTA each. *3D product showcase mode:* 4-5 products in a thumbnail strip at the bottom; the selected product rotates in 3D on the stage above and the products alternate automatically, each with price, "View product" and "Add to cart". Both modes keep real HTML text, a preloaded LCP image and a static fallback. Spec in §3A.2.
4. **Trust strip:** solid sheesham wood, Pan-India delivery, secure UPI payment, plus warranty and returns lines **only** where the policy is real (§3C.3).
5. **Shop by category / room** tiles with photos.
6. **Bestsellers** and **New launches** (driven by the flags in §3C.1).
7. **Why Raazwood / our craft:** short brand story with real workshop photos and only certifications really held.
8. **Offers** (real public coupons, §3C.2).
9. **Customer reviews** with city and "Verified purchase" (photos once §3C.5 is built).
10. **Custom and bulk enquiry** block (§3C.4) and the existing custom-size WhatsApp banner.
11. **Buying guides / blog** teasers (SEO and trust).
12. **Newsletter signup** (with consent).
13. **Footer:** brand line ("Raazwood, a brand of Krishana Art Palace"), merchant details, policy links, contact, social links.

Not on the homepage: anything that pushes products below the first two screens, auto-playing video with sound, pop-ups on first load, and fake urgency.

### 3D.3 Listing and product card
- Card: main image with second-image swap on hover, name, price, MRP, saving, rating, lead-time chip (§3C.1), wishlist heart, quick add-to-cart.
- Filters as a sticky sidebar on desktop and a bottom sheet on mobile; active filters shown as removable chips; sort control always visible; skeleton loaders while loading.
- Clear empty and no-result states that suggest popular categories.

### 3D.4 Product page (where the purchase decision happens)
- Large gallery with zoom: main, angles, details, dimension drawing, in-room images.
- Price block: price, MRP, saving, "You pay ₹X with coupon" (when real), GST-inclusive note.
- Variant selectors with price per option and finish swatches (§3C.1); delivery estimate by pincode; lead time.
- Primary **Add to cart** and **Buy now**; secondary WhatsApp enquiry (product link and pincode prefilled). **Sticky buy bar on mobile.**
- Trust block near the button: secure UPI payment, delivery promise, warranty / returns summary (only real terms), "Also available on" marketplace links where set.
- Spec table, care, natural-wood note, per-product FAQ, reviews, cross-sell ("Complete your bedroom"), recently viewed.

### 3D.5 Cart and checkout
- Slide-in mini cart; cart page with editable quantity, coupon field, clear delivery estimate and savings.
- **Distraction-free checkout** (no mega menu, no promos): guest checkout allowed, saved addresses and phone pre-fill for returning customers, inline validation, visible progress, **UPI presented first and prominently**.
- Order summary with GST-inclusive total, shipping and discount lines always visible; trust cues (secure payment, policy links) next to the pay button.
- Clear failure and retry messages for payment; order confirmation page with next steps and WhatsApp / email confirmation.
- Free-delivery progress bar only when it matches the real `DeliveryZone` charges.

### 3D.6 Reaching customers and brand awareness
These bring visitors to the site; the design above converts them.
- **Search:** SEO plan in §7 (product pages, South India city pages, buying guides) remains the main free channel.
- **Google:** Google Business Profile, Google Merchant Center product feed (moved up from the backlog in §3.3 to Sprint 7), Search Console.
- **Social and content:** Instagram and Pinterest posts / reels from real workshop and room photos, YouTube videos of the craft and product care; each product page has share buttons and a WhatsApp "share this product" link. Open Graph images (1200x630) with the logo so links look good in WhatsApp.
- **WhatsApp:** WhatsApp Business catalogue and broadcast lists (with consent), click-to-WhatsApp links from ads and posts.
- **Paid (optional):** Google Ads and Meta ads geo-targeted to the five southern states, with UTM links and conversion events.
- **Reviews and referrals:** automatic review request after delivery, customer stories page (§3C.5), simple referral or share-and-save coupon (later).
- **Measurement:** GA4 e-commerce events (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`) loaded after cookie consent; UTM tracking per channel.

### 3D.7 Keeping visitors on the site
- Fast pages first: LCP under 2.5 s on mobile; images in WebP/AVIF with fixed sizes; no layout shift.
- Easy discovery: search with suggestions, trending searches, recently viewed, wishlist, notify-me when back in stock.
- Help at the right moment: AI assistant (§3B), WhatsApp button, callback request (§3C.4).
- **No dark patterns:** no fake countdowns, fake stock warnings or fake "people are viewing"; urgency only when real (§3C.2).

### 3D.8 What to measure
Bounce rate, product views per session, add-to-cart rate, checkout start to payment success, mobile vs desktop conversion, traffic by channel. Set baseline targets after the first weeks of real traffic and A/B test hero banners and product-page layouts one change at a time. Judge every design change by orders and Core Web Vitals, not by how it looks.

### 3D.9 Sprint mapping
| When | Items |
|---|---|
| **Sprint 6a (before launch)** | Hero with banner mode + 3D product showcase mode (replaces the table hero and old admin modes), modern design system and homepage structure (3D.1, 3D.2), product card and product page polish (3D.3, 3D.4), checkout polish (3D.5), product turntable photos, real photos and SVG logo in place |
| **Sprint 7** | PWA, 3D.6 reach items (Merchant Center feed, social sharing, review requests, WhatsApp catalogue), GA4 e-commerce events, A/B tests (banner vs 3D showcase, layout variants) |
| **Later** | Referral coupon, PWA, regional-language storefront |

---

## 3A. Animation & Motion Design (Experience Layer)

**Goal:** a premium, immersive, animated store that makes visitors stay longer and explore more, **without hurting speed or SEO**.

### 3A.1 Intro / logo animation: removed

**Decision (28 Nov 2026):** the full-screen intro (logo drawing itself, the two "O"s merging into an infinity loop) is **removed**. Visitors see the header hero straight away: faster first view, no skip button, no `sessionStorage` logic, no need for a letter-by-letter SVG logo. The logo appears normally in the header (and in the hero where the design needs it). Any existing intro code is deleted in Sprint 6a.

### 3A.2 Hero Section: banner mode and 3D product showcase mode

**Decision (28 Nov 2026):** the header hero keeps **both** options and the owner switches between them in **Admin > Homepage hero**. The old scroll-driven table (top view to 3D front view) and the product-photo cross-fade are replaced by the 3D product showcase.

**Mode 1: Banner mode.** Up to 6 promotional banners (clickable, uploaded in admin, WebP in two sizes as today), swipeable on mobile, with real HTML headline and CTA over each banner. First banner is the LCP element.

**Mode 2: 3D product showcase mode.**
- **Layout:** a large stage on top with the selected product shown in 3D / rotating view; at the **bottom a strip of 4 or 5 product thumbnails** (admin chooses which products and their order, from the existing catalogue).
- **Behaviour:** the products **alternate automatically** (for example every 6-8 s): the current product rotates smoothly (turntable, about one full turn), then transitions to the next one, and the active thumbnail is highlighted with a progress ring. Clicking or tapping a thumbnail switches to that product immediately and pauses autoplay for a while; drag / swipe on the stage rotates it by hand.
- **Per-product content on the stage:** name, short line, price (and MRP / saving), and two buttons: "View product" and "Add to cart" (or "Shop now"), all as real HTML text and links.
- **Background and mood:** soft studio light, wood / cream gradient and subtle shadow under the product, brand colours from §1B. Mouse-move parallax tilt on desktop, gyroscope tilt optional on mobile.

How the 3D look is produced (decide per product in the Sprint 0.5 prototype; the admin can mix them):

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Real 3D model (GLB)** | `three.js` + `@react-three/fiber` + `drei`, Draco-compressed GLB under 1.5 MB per product, lazy loaded | True 3D, drag to rotate, reusable for the product page 360 viewer | A model must be made for each showcase product (Blender / photogrammetry / 3D artist); heavier on low-end phones |
| **B. 360 image sequence (turntable)** | 36-72 WebP frames per product shot on a rotating turntable (or rendered), drawn on `<canvas>` or swapped by frame | Looks identical on every device, very light on GPU, real product photos, cheapest to produce | Frames download (about 0.5-1.5 MB per product, lazy loaded); fixed camera height |
| **C. Fallback: static photo + CSS 3D tilt** | One or two photos with `perspective` + `rotateY` and a slow zoom | Lightest, works everywhere | Less realistic |

Recommended start: **option B for all 4-5 showcase products** (fast to produce with a phone turntable, reliable on mid-range Android), and option A later for products where a model exists.

Rules for the showcase:
- **Real HTML text for `<h1>`, product names, prices and links**, never inside canvas or images, so Google can read them. One `<h1>` for the page.
- The first product's **poster image is preloaded and is the LCP element**. The 3D / canvas layer and the other products load lazily after first paint.
- **Fallbacks:** low-end devices, `Save-Data`, slow networks and `prefers-reduced-motion` automatically get option C (static photo, no autoplay rotation, thumbnails still work). A "Pause animation" control is always available.
- Pause rendering when the tab is hidden or the hero is off screen (IntersectionObserver); target 60 fps; animate only `transform` / `opacity` or the canvas; no layout shift.
- Keep initial JS under the budget in §3A.5: the showcase code is dynamically imported and never blocks first paint, add-to-cart or navigation.
- If a mode has no valid content (no active banners, or fewer than 2 showcase products), the hero falls back to a static brand hero (photo + headline + CTA), never to an empty area.
- Admin: choose mode, choose products and order, set autoplay speed, upload / link the 360 frames or GLB per product, preview on desktop and mobile before publishing.

### 3A.3 Site-wide animations
- Smooth scrolling (Lenis) and scroll-reveal for sections, cards and headings (fade/slide/stagger)
- Product cards: hover zoom, second-image swap, quick "Add to cart" slide-up, wishlist heart pop
- Category tiles with a simple hover zoom; horizontal-scroll "Bestsellers" strip
- Animated counters/trust badges (Pan-India delivery, solid sheesham, years of craft)
- Product page: image zoom, sticky add-to-cart bar, animated price/discount tag
- Cart: slide-in mini cart drawer, "flying to cart" animation, animated progress bar for free-delivery threshold
- Checkout: step transitions, success animation (check mark / confetti) on order confirmation
- Page transitions between routes (View Transitions API / Framer Motion), skeleton loaders, micro-interactions on buttons and inputs
- Subtle wood-grain / cream textured backgrounds, no heavy autoplay video

### 3A.4 Animation tech stack
| Need | Library |
|---|---|
| Scroll timelines, pinning, SVG draw/morph | **GSAP + ScrollTrigger** (free for use) |
| 3D hero showcase (option A) | **three.js + @react-three/fiber + drei** (lazy loaded, client-only); option B uses plain `<canvas>` |
| React component animation, page transitions | **Framer Motion (Motion)** |
| Smooth scrolling | **Lenis** |
| Lottie (small icon animations) | `lottie-react` (only where needed) |

### 3A.5 Performance & SEO guardrails (non-negotiable)
Many South India visitors will be on mid-range Android phones over 4G, so animation must stay smooth:
- Animate only `transform` and `opacity` (GPU-friendly); target **60 fps**, no layout shift (CLS < 0.1)
- **LCP < 2.5 s and INP < 200 ms must still pass** with animations on. Heavy libraries (three.js, GSAP plugins) are **dynamically imported** and loaded after first paint
- JS budget for the home page (animation included): defined in Sprint 0 (suggested: under 250 KB gzipped initial JS)
- `prefers-reduced-motion` honoured everywhere (animations reduced to simple fades), plus a manual "Reduce animations" toggle
- No content hidden from crawlers: text and links exist in the HTML before animation runs; animation never gates navigation
- Pause animations when the tab is hidden or the section is off-screen (IntersectionObserver)
- Animation never blocks checkout: simplified, distraction-free checkout page
- Device tiering: detect GPU/CPU (`navigator.hardwareConcurrency`, `deviceMemory`), `Save-Data` and network speed, and serve Full (3D showcase, reveals) / Lite (360 frames or static hero, reveals only) / Static experience

### 3A.6 Engagement targets
Track with GA4 / Vercel Analytics: average engagement time, scroll depth, bounce rate, product views per session, add-to-cart rate. A/B test hero variants (banner vs 3D showcase) in later sprints. **If animation reduces conversion or Core Web Vitals, tone it down: engagement is only useful if it leads to orders.**

### 3A.7 Assets needed
- [ ] SVG logo (single vector file plus reversed white version; separate letter paths no longer needed)
- [ ] For the 3D product showcase: 4-5 hero products, each as a 360 turntable photo set (36-72 frames, same camera height, neutral background) or a GLB model, plus one clean poster photo per product
- [ ] 3 to 6 real banner photos for banner mode (furnished room, workshop / craft, bestseller close-up), landscape 2000 px wide plus a portrait crop for mobile
- [ ] Brand motion guidelines (easing, durations): proposed `ease: power3.out`, durations 0.4-0.8 s, stagger 0.08 s

---

## 3B. AI Shopping Assistant ("Raazwood Assistant")

**Goal:** a chat assistant on every page that helps customers with anything on the website: finding the right furniture, sizes and materials, delivery and shipping, payment/UPI problems, order status, returns and care tips. It should feel like a helpful showroom salesperson, available 24x7, and hand over to a human when needed.

### 3B.1 What it can do
| Area | Examples |
|---|---|
| Product help | "Show me a king size bed under 40k", compare two sofas, suggest a dining set for 6 people, explain sheesham vs teak, finishes, dimensions |
| Navigation | Open category/product pages, add to cart, apply coupon, explain how to checkout |
| Delivery | Check pincode serviceability, shipping charge and estimated delivery date, packaging and assembly info |
| Payment | How to pay via UPI/Razorpay, what to do if payment failed or money was debited |
| Orders | Track an order (after verification), cancellation/return policy, how to raise a return request |
| Policies / FAQ | Warranty, care instructions, GST invoice, return/refund timelines |
| Handover | "Talk to a human" opens WhatsApp / call with the conversation summary and product/order context prefilled |
| Lead capture | If the customer is undecided, offer to send the product details or a quote on WhatsApp (with consent) |

**Languages:** English + Hinglish at launch; Telugu, Tamil, Kannada, Malayalam, Hindi next (matches the South India focus). Replies in the language the customer writes in.

### 3B.2 How it works
- **Free-first:** runs on a **free-tier LLM API**, called **only from the server** (Next.js route handler). The API key is never exposed to the browser.
- **Default provider: Google Gemini API free tier** (get a key from Google AI Studio, no billing needed). Use a small/fast "Flash-Lite" or "Flash" class model (exact name set in `ASSISTANT_MODEL`). The free tier has lower rate limits (requests per minute/day), so the design below is built around those limits.
- **Provider-agnostic adapter** (`lib/ai/provider.ts`): the rest of the code never talks to a specific vendor. A second free provider (candidates to evaluate in Sprint 5: Groq, OpenRouter free models, Cloudflare Workers AI) can be plugged in as an automatic **fallback**, and a paid model can be switched on later by changing env variables only.
- **Last-line fallback (no AI at all):** if every provider is rate-limited or down, the widget switches to a rule-based mode: FAQ search, pincode checker, product search and the WhatsApp button, so customers are never left with an error.
- **Saving the free quota:** reply cache for common questions (delivery, returns, payment), short system prompt, short history window, small max output, rate limit per visitor, and quick-reply chips that are answered **without calling the LLM** at all.
- **Tool use**, so answers come from real store data and not from the model's memory:
  - `search_products(query, filters)`, `get_product(slug)`: reads the Postgres catalogue (about 100 listings, so no vector DB needed)
  - `check_pincode(pincode)`: serviceability, shipping charge, delivery estimate
  - `get_policy(topic)`: shipping, returns, warranty, care, payment FAQs from the knowledge base (markdown/DB)
  - `get_order_status(orderId)`: only after verification (order ID + phone OTP or logged-in user)
  - `add_to_cart(variantId, qty)`: acts on the customer's own cart only
  - `handoff_to_human(summary)`: creates a handoff record and a WhatsApp link
- **Streaming responses** (token by token) for a fast feel; product cards, price, image and "Add to cart" buttons rendered inside the chat.
- A short, well-tested **system prompt** (brand voice, rules, languages). Policies/FAQs are fetched via `get_policy` only when needed instead of being stuffed in every request.
- Model/provider chosen via `ASSISTANT_PROVIDER` and `ASSISTANT_MODEL` env variables. Free-tier model names and limits change often: **verify the current list and limits in the provider docs (https://ai.google.dev/gemini-api/docs/pricing and /rate-limits) and check that the free tier's terms allow commercial use** before launch.
- Conversation state kept in DB (`ChatSession`, `ChatMessage`) with short history window to limit tokens.

### 3B.3 Guardrails (must-have)
- **Never invent** price, stock, discount, delivery date or policy: always from tools. If unknown: say so and offer the human handover.
- No legal/tax/financial advice, no promises beyond the written policies (refunds, delivery dates are "estimated").
- **Privacy:** never ask for or store card numbers, UPI PIN, OTP or passwords. Mask phone/address in logs. Order details only after verification.
- **Prompt-injection safe:** user messages and product data are treated as data, never as instructions; tools run with the customer's own permissions only; server re-validates every tool call (prices and totals are always recalculated by the backend).
- **Abuse and quota control:** rate limit per IP/session, max message length, max tokens per reply, global daily request cap with alert, bot protection (Turnstile), automatic fallback (second provider, then rule-based mode) when the free quota is reached or the API is down.
- **Free-tier privacy:** free tiers of most providers may use submitted content to improve their products. So **never send personal data to the LLM**: no phone numbers, addresses, names, OTPs or payment details. Order tracking in v2 is done by the backend and the LLM only receives a sanitised status (e.g. "Shipped, expected 24 Nov"). Mention AI usage in the Privacy Policy.
- Off-topic questions are politely redirected to furniture and the store.
- Clear disclosure "AI assistant" with an option to reach a human; customer consent for chat storage mentioned in the Privacy Policy (DPDP Act 2023).
- Thumbs up/down on each answer and "report a problem" for continuous improvement.

### 3B.4 UI / UX
- Animated floating button (hexagon tree logo) bottom-right; opens a chat panel (full-screen sheet on mobile), brand colours from §1B
- Quick-reply chips: "Find a bed", "Check delivery to my pincode", "Track my order", "Talk to a human"
- Typing indicator, streaming text, product carousels, voice input (later sprint)
- Context-aware: on a product page it already knows the product ("Is this available in 6x6.5 ft?")
- **Lazy loaded** after first paint so it never affects LCP/INP; hidden on checkout payment step unless the customer opens it
- Fully keyboard accessible, `aria-live` for new messages, respects reduced-motion

### 3B.5 Admin side
- Conversation log viewer (searchable, with consent-based retention, e.g. 90 days)
- "Unanswered / low-rated questions" report to improve FAQs and policies
- Knowledge base editor (policies, FAQs, care guides) with preview. Changes go live without redeploy
- Handoff inbox and lead list (WhatsApp follow-ups)
- Usage dashboard: messages/day, requests and tokens vs free-tier limits, fallback count, resolution rate, conversion from chat to order

### 3B.6 Success metrics
Resolution rate without human, handover rate, add-to-cart and order conversion from chat sessions, average response time, CSAT (thumbs), how often the free quota / fallback is hit.

### 3B.7 Rollout
- **v1 (Sprint 5):** product Q&A, delivery/pincode, policies/FAQ, handover to WhatsApp, English + Hinglish
- **v2 (Sprint 7+):** order tracking with OTP verification, add-to-cart from chat, regional languages, voice input, abandoned-cart nudges
- **Note:** the assistant is **kept at zero cost** for now (free tier only). Assistant is a secondary priority: v1 is intentionally small. If traffic outgrows the free limits, switch to a paid plan/model from env without code changes.

---

## 4. Architecture

```
Browser ──► Vercel Edge/CDN ──► Next.js (SSR / ISR / Route Handlers)
                                   │
                    ┌──────────────┼───────────────┐
                    ▼              ▼               ▼
              Neon Postgres   Image CDN       Payment provider
              (Prisma)        (Cloudinary/    (UPI + webhooks)
                               Bunny)
                                   │
                           Email / SMS / WhatsApp
```

### Folder structure (as built)
```
raazwood/
├─ src/
│  ├─ app/                    # Next.js App Router
│  │  ├─ page.tsx, shop/, c/[slug]/, product/[slug]/, cart/, checkout/, order/[publicId]/, invoice/[publicId]/
│  │  ├─ account/             # customer: login (OTP), orders, addresses, wishlist, profile
│  │  ├─ blog/, faq/, furniture-in/[city]/, legal pages
│  │  ├─ admin/               # protected admin (middleware + requireAdmin in every page/action)
│  │  ├─ api/                 # route handlers: checkout, quote, pincode, auth/otp, wishlist, reviews, search, webhooks, cron
│  │  ├─ media/[id]/          # serves uploaded hero/banner images
│  │  ├─ sitemap.ts, robots.ts, layout.tsx
│  ├─ components/             # UI (server and client components)
│  ├─ config/                 # store settings, states, cities, FAQ
│  ├─ lib/                    # pure logic, unit-tested: money, tax, pricing, coupon, otp, csv, upi, seo, validators (zod)
│  └─ server/                 # server-only services: db, orders, catalog, auth, otp, delivery zones, messaging, audit
├─ prisma/ (schema.prisma, migrations/, seed.ts)
├─ tests/ (unit/, e2e/)
├─ public/
├─ docker-compose.yml         # local Postgres
├─ .github/workflows/ci.yml
└─ README.md
```

---

## 5. Data Model (core tables)

**As built** (`prisma/schema.prisma`): `Customer` (phone login), `OtpCode`, `Address`, `WishlistItem`, `Category`, `Product` (images as URL list, `deletedAt` soft delete), `Variant` (size/pack/SKU/price/stock/delivery charge), `Order` (with coupon, payment method, UTR), `OrderItem` (price snapshot + discount share), `Payment`, `Coupon`, `Review`, `BlogPost`, `DeliveryZone` (the plan's `PincodeZone`, per state), `AdminUser`, `AuditLog`, `Counter` (invoice numbers), `ProductMarketplace` (Amazon/Flipkart/Meesho link per product), `SiteImage` + `HeroSlide` + `SiteSetting` (homepage hero).

**Planned for §3C:** `ProductImage` (replaces the URL list: type, alt, sort order), `ProductOption` / `OptionValue` (finish, size, storage, wood, with swatch image and per-option price), on `Product`: `fulfilmentType`, `productionDaysMin/Max`, `specs` (structured), `faqs`, flags `isBestseller` / `isFeatured`; `Collection` + `CollectionItem`; `RelatedProduct` (cross-sell); `ReturnClaim` + `ClaimMedia` (RMA, status history); `WarrantyClaim` (or one `SupportTicket` table with a type); `Lead` (type CUSTOM / BULK / CALLBACK / VIDEO_CALL, status, notes, attachments); `Subscriber` (consent, unsubscribe token); `StockAlert`; `Review` gets photos and city.

Not needed yet / later: `Cart` (the cart lives in the browser and is re-priced on the server), `Shipment` (status on the order for now), `ChatSession`, `ChatMessage`, `Handoff`/`Lead`, `KnowledgeArticle` (assistant v2).

Rules:
- Prices stored in **paise (integers)**, never floats.
- Stock decrement inside a DB transaction; reserve stock at checkout, release if payment not confirmed within N minutes.
- Order snapshots product name/price at purchase time.
- Soft delete for products/categories.

---

## 6. Payments — UPI (Phase 1)

Two valid approaches; build behind one interface so either can be used or swapped:

**Option A — Payment gateway with UPI (recommended for "no gaps")**
Razorpay / Cashfree / PhonePe PG etc. Supports UPI intent, collect and QR; **automatic confirmation via webhooks**, refunds API, reconciliation. Needs business KYC; check current fees.

**Option B — Direct UPI to your own VPA (zero fees, manual)**
Show UPI QR / `upi://pay` deep link with exact amount + order ID → customer pays → enters UTR → admin verifies in bank app/statement. Simple, but manual and error-prone at volume.

Implementation requirements (both):
- One code path per provider behind `paymentMode()`: Razorpay (create order, verify signature, webhook) and manual UPI (UTR + admin confirmation) share the same `finalizePaid()` step. Refunds are issued from the Razorpay dashboard or bank, then marked in admin.
- Order created as `PENDING_PAYMENT`; only becomes `PAID` after verified confirmation (never trust the client redirect)
- Webhook signature verification + idempotency keys (no double processing)
- Payment timeout & retry flow; failed/abandoned handling
- Amount tamper protection (server recalculates totals)
- Daily reconciliation report in admin (**built:** Admin > Payments)
- Refund workflow documented in Returns policy

---

## 7. SEO Plan (built into development)

**Technical**
- Server-rendered / ISR pages for all category, product and blog pages
- Next.js Metadata API: unique `title`, `description`, canonical URL per page
- Clean, keyword-friendly slugs: `/sheesham-wood-king-size-bed`
- Auto-generated `sitemap.xml` (products, categories, blog) + `robots.txt`
- **JSON-LD structured data**: `Organization`, `LocalBusiness`, `Product` (price, availability, rating), `BreadcrumbList`, `FAQPage`, `Article`
- Open Graph + Twitter cards (share previews for WhatsApp)
- `next/image` with WebP/AVIF, lazy loading, explicit width/height, descriptive `alt` text
- Core Web Vitals targets: LCP < 2.5s, CLS < 0.1, INP < 200ms; Lighthouse ≥ 90 (mobile)
- Proper 301 redirects when slugs change; custom 404; no duplicate content (canonicals on filter/sort URLs, `noindex` on cart/checkout/account/admin)
- HTTPS, HSTS, mobile-first responsive design
- Breadcrumbs and internal linking (related products, category links)

**South India focus**
- Target states/cities in content and landing pages: Hyderabad, Bengaluru, Chennai, Coimbatore, Kochi, Visakhapatnam, Vijayawada, Madurai, Mysuru, Thiruvananthapuram
- City/state landing pages with genuinely useful content (delivery time, freight, packaging, assembly, local queries), e.g. `/sheesham-furniture-hyderabad`. No copy-paste doorway pages.
- Keywords by demand in the South (e.g. "sheesham wood cot", "solid wood sofa set online", "wooden bed online Bangalore") validated with Google Keyword Planner / Search Console
- Regional-language support planned: Telugu, Tamil, Kannada, Malayalam (Sprint 7+). Use `hreflang` + separate URLs when added
- Delivery promise shown on every product page by pincode ("Delivery to Hyderabad in X–Y days")
- Google Business Profile / Merchant Center configured for India; Google Ads geo-targeting (optional) for the 5 southern states
- Social proof: reviews and testimonials from South India customers, shown with city name
- WhatsApp enquiry button with product + pincode prefilled
- Page speed tuned for mid-range Android phones and 4G (largest share of traffic)

**Content & Off-page**
- Keyword research (sheesham wood furniture, solid wood bed, etc.) mapped to pages
- Unique product descriptions (no copy-paste from catalogue/suppliers)
- Buying guides / blog: "Sheesham vs Teak", "How to choose a bed size", care tips
- Google Search Console + Bing Webmaster setup, sitemap submitted
- Google Business Profile (local SEO), Google Merchant Center free listings
- NAP (name/address/phone) consistent across site, GBP and directories

**SEO CI check:** a Lighthouse CI + custom script fails the build if a page is missing title / description / canonical / structured data.

---

## 8. Sprint Plan (2-week sprints)

| Sprint | Theme | Deliverables |
|---|---|---|
| **0** | Foundation | Repo, Next.js + TS + Tailwind, ESLint/Prettier/Husky, Neon DB + Prisma, env setup, CI (lint/test/build), Vercel project + preview deploys, domain DNS, design system/tokens, decisions on payment provider & image CDN |
| **0.5** | Motion prototype | Hero 3D product showcase prototype (pick option A/B/C per product, §3A.2), performance budget, reduced-motion + device tiering |
| **1** | Catalogue + SEO base | Category/product pages, admin product CRUD, image pipeline, seed data, metadata, sitemap, robots, JSON-LD, breadcrumbs |
| **2** | Discovery + Cart | Search, filters, sorting, wishlist, cart (guest + logged-in), variants & stock logic |
| **3** | Checkout + UPI | Auth (OTP), addresses, pincode shipping, order creation, UPI payment + webhooks, confirmation page |
| **4** | Orders + Admin | Order management, status flow, notifications (email/WhatsApp), coupons, dashboard, CSV export, tax invoice generation (IGST) |
| **5** | Content + Trust + Motion polish + AI Assistant v1 | AI assistant v1 (§3B), Site-wide animations, page transitions, success animations, Static/legal pages, blog, reviews, FAQs, WhatsApp enquiry, analytics, cookie consent |
| **6** | Hardening + Launch | Full QA, load test, security review, SEO audit, backups, monitoring, soft launch → public launch |
| **7+** | Iterate | Backlog items by priority (cards, COD, invoices, shipping integration…) |

Each sprint: planning → build → test → demo → retro. Every sprint ends with a **deployable** build.

### Definition of Done (every ticket)
- [ ] Code reviewed (PR) and merged to `main`
- [ ] Unit/integration tests written and passing
- [ ] E2E test updated for the user flow
- [ ] Accessibility checked (keyboard, contrast, labels)
- [ ] Mobile + desktop verified
- [ ] SEO checklist passed (if page-related)
- [ ] No new Lighthouse regression (animations included)
- [ ] Reduced-motion and low-end fallback verified for any new animation
- [ ] If it touches the assistant: eval set re-run, no regression in accuracy/safety checks
- [ ] Docs/README/changelog updated

---

## 9. Testing Strategy

| Type | Tool | Scope |
|---|---|---|
| Unit | Node's built-in test runner (`node --test`, TypeScript via Node 22 type stripping) | Price/GST/shipping calc, coupon logic, OTP, CSV, UPI, validators, assistant rules |
| Component | React Testing Library (not set up yet) | Cart, forms, filters |
| Integration | Test DB (Docker Postgres from `docker-compose.yml`) — not automated yet | API routes, services, webhooks |
| E2E | Playwright | Browse → cart → checkout → UPI (mock) → order; admin flows; mobile viewport |
| Payment | Provider sandbox/test mode | Success, failure, timeout, duplicate webhook, tampered amount |
| Accessibility | axe + Lighthouse | WCAG 2.1 AA target |
| Performance | Lighthouse CI, (k6 for load) | Web Vitals budgets, checkout under load |
| SEO | Lighthouse SEO + custom script, Rich Results Test | Meta, schema, sitemap validity |
| Security | `npm audit`, OWASP ZAP baseline, manual review | See §10 |
| AI assistant | Eval set of 100+ real customer questions (English/Hinglish/regional), automated checks + manual review; red-team prompts | Correct prices/stock/delivery (no hallucination), tool-call correctness, prompt-injection and data-leak attempts, handover flow, rate limit/budget cap, API-down fallback |
| Animation / motion | Playwright + Chrome DevTools traces, Lighthouse CI, real mid-range Android test | 60 fps check, reduced-motion mode, fallbacks, CLS/LCP with animation on |
| Cross-browser/device | Playwright (Chromium/Firefox/WebKit) + real Android/iPhone check | |
| UAT | Owner walkthrough with checklist before each release | |

CI pipeline (GitHub Actions, `.github/workflows/ci.yml`): install → migrate → seed → typecheck → lint → unit → build + E2E (Playwright). Lighthouse CI is planned, not set up.

Target: ≥ 80% coverage on business logic (pricing, orders, payments, inventory).

---

## 10. Security & Compliance

- HTTPS everywhere, secure headers (CSP, HSTS, X-Frame-Options), CSRF protection
- Passwords hashed (argon2/bcrypt), rate limiting on login/OTP/checkout, bot protection (Turnstile/reCAPTCHA)
- Input validation (Zod) on every endpoint; Prisma parameterised queries
- Role-based admin access, audit logs for price/stock/order changes
- Secrets only in Vercel env vars; never committed; `.env.example` in repo
- AI assistant: server-side API key only, tool permissions scoped to the current customer, chat logs retention + consent, no personal or sensitive data (phone, address, OTP, UPI PIN, card) sent to the LLM or stored in chat logs
- Never store card data; store only UPI transaction/reference IDs
- Automated DB backups + tested restore procedure
- **India legal pages & requirements:** Privacy Policy (DPDP Act 2023), Terms, Shipping, Returns/Refund, Cancellation; seller details (business name, address, contact, GSTIN if registered), grievance officer details as per E-Commerce Rules 2020; GST-compliant invoices; cookie consent
- Confirm with your CA/legal advisor for GST and policy wording

---

## 11. Environment Variables

`.env.example` is the single source of truth: it lists every variable the code reads, with comments. Copy it to `.env.local` for development and add the same names in Vercel for production. Only `DATABASE_URL`, `DIRECT_URL` and `ADMIN_JWT_SECRET` are required to run; payments, SMS, email, WhatsApp, analytics and AI are optional and switch on when their variables are set.

---

## 12. Getting Started

See [Quick start](#quick-start-on-your-computer) at the top.

Scripts: `dev` · `build` · `vercel-build` (migrate + build, used by Vercel) · `start` · `lint` · `typecheck` · `test` · `test:e2e` · `db:up` · `db:migrate` · `db:deploy` · `db:seed` · `db:studio`

**Git workflow:** `main` (production) ← `develop` ← `feature/*`. Conventional commits (`feat:`, `fix:`, `chore:`). PRs require passing CI + 1 review (self-review checklist if solo).

**Deploy:** push to `main` → Vercel production; PRs → preview URLs. `vercel-build` runs `prisma migrate deploy` before `next build`.

---

## 13. Business Inputs Needed (before Sprint 1)

- [ ] Final domain name + registrar access
- [ ] Logo, brand colours, fonts
- [ ] Product list: names, categories, sizes, prices/MRP, materials, finishes, stock
- [ ] Product photos (multiple angles, white/neutral background, min 1200px)
- [ ] Shipping charges by pincode/state for South India (freight partner rates, weight/volume per product), delivery timelines
- [ ] Return/refund/cancellation policy
- [ ] GSTIN, HSN codes and GST rate per product (confirm with CA), business address, phone, email
- [ ] UPI VPA / payment gateway account (KYC)
- [ ] WhatsApp business number
- [ ] FAQs, return/warranty/care policies and delivery timelines (knowledge base for the AI assistant)
- [ ] Google AI Studio account / API key for the assistant (free)
- [ ] (§3C) Warranty terms: duration, covered / not covered, claim process and response time
- [ ] (§3C) Return and damage-report window, eligible reasons, exclusions, cancellation rule, any refund deduction
- [ ] (§3C) Lead time per product: ready-to-ship vs made-to-order, production days, custom-order lead time
- [ ] (§3C) Dimensions in cm and inches for every product, mattress sizes for beds, secondary materials, weight
- [ ] (§3C) Finish swatch photos (one per finish) and a short natural-wood disclaimer you are happy with
- [ ] (§3C) Real workshop / factory photos or video, real certifications (if any), customer photos with permission
- [ ] (§3C) Grievance officer name and email; registered address; showroom or pickup address and hours (if any)
- [ ] (§3C) Working hours for callback and video-call support
- [ ] (§3D) Turntable (360) photo sets or 3D models for the 4-5 hero showcase products, banner / lifestyle photos (furnished rooms, workshop, bestsellers), brand story text, social media handles (Instagram, YouTube, Pinterest, Facebook), Google Business Profile access, founder / workshop photo

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Free-tier limits / commercial-use terms | Monitor usage; budget for Vercel Pro + paid DB tier; keep DB portable (standard Postgres) |
| UPI payment mismatch / double payment | Webhook + idempotency + admin reconciliation |
| Large furniture shipping complexity & damage | Pincode-based rates, clear delivery/return policy, packaging notes |
| Poor product photos hurt conversion & SEO | Photo guidelines, image optimisation |
| Overselling stock | Transactional stock reservation |
| Heavy animation/3D slows site on low-end phones, hurts SEO and conversion | Lazy loaded 3D, 360 image frames instead of heavy models, device tiering, static fallback, JS budget in CI, Lighthouse gate, A/B test hero modes |
| Missing vector logo, 360 photo sets / 3D models or real photos make the hero look generic | Get the SVG logo and a product photo shoot (turntable for 4-5 hero products) before the redesign goes live (§13); static poster fallback meanwhile |
| AI assistant gives a wrong price/policy or leaks data | Tool-grounded answers only, server-side validation, verification before order data, eval set in CI, human handover |
| Free-tier limits hit, model/terms change, or content used for provider training | Reply cache, rate limits, fallback provider + rule-based mode, adapter to switch vendor, no personal data sent to LLM |
| Misleading MRP / fake countdown (consumer-protection risk) | Real MRP only, genuine sale end dates, legal review of wording (§3C.2) |
| Fraudulent or abusive return / warranty claims | Claim window, photo or video evidence, admin approval, audit log |
| Public upload forms abused (spam, malware) | File type and size limits, Turnstile, rate limits, private storage (§3C.8) |
| Placeholder text reaching production | CI scan for leftover placeholders (§3C.8) |
| Scope creep | Strict sprint backlog; new ideas go to backlog |

---

## 15. License
Private / proprietary — © Krishana Art Palace (Raazwood). All rights reserved.
