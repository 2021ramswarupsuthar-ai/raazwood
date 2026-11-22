# Raazwood: E-commerce Website (Krishana Art Palace)

> **Code status: Sprint 0 to 4 core built, plus assistant v1 and motion hero. Not yet run end-to-end against a real database / Razorpay.** See [Implementation status](#implementation-status) and `docs/TESTING.md` before deploying.

## Quick start (on your computer)

Requirements: Node.js 22.18+ and a free Neon Postgres database.

```bash
npm install
cp .env.example .env.local      # then fill DATABASE_URL, DIRECT_URL, ADMIN_JWT_SECRET (openssl rand -base64 48)
npx prisma migrate dev --name init   # creates the tables (commit the generated prisma/migrations folder)
npm run db:seed                 # categories + SAMPLE products + admin user (ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD)
npm run dev                     # http://localhost:3000   (admin: /admin)
npm test                        # unit tests (no database needed)
npm run typecheck && npm run lint
npm run test:e2e                # Playwright (needs the seeded database)
```

Razorpay (test mode first): put test keys in `.env.local`, then in Razorpay Dashboard add a webhook to `https://<your-domain>/api/webhooks/razorpay` with events `payment.captured`, `order.paid`, `payment.failed` and copy its secret to `RAZORPAY_WEBHOOK_SECRET`. For local testing expose localhost with a tunnel (ngrok / cloudflared).

Deploy: push to GitHub, import into Vercel, add all env variables, set `DATABASE_URL`. Run `npx prisma migrate deploy` against the production database once.

## Implementation status

| Area | Status |
|---|---|
| Storefront: home, shop, category, product, search, cart, checkout, order tracking, invoice | Built |
| UPI payment via Razorpay (create order, client verify, signed webhook, idempotent, amount check, late-payment handling) | Built, **needs Razorpay test-mode run** |
| GST: inclusive prices, CGST+SGST (Rajasthan) / IGST (other states), per-order invoice with FY numbering | Built, unit-tested. Rates/HSN to confirm with CA |
| Pincode / state / delivery estimate / serviceability | Built (pincode to state is approximate; the customer-chosen state decides tax). Delivery days are **placeholders** in `src/config/store.ts` |
| Stock reservation (30 min), release of expired orders (lazy + daily cron) | Built, **needs DB integration test** |
| Admin: login, dashboard, products + variants ("Set of 2" via pack qty), orders + status flow | Built |
| SEO: metadata, canonical, sitemap, robots, JSON-LD (Product, Breadcrumb, FAQ, Organization), South India city pages, noindex on private pages | Built |
| Motion: intro logo animation (infinity into the two O's), scroll-driven table hero (top view to 3D front view), reveal animations, reduced-motion fallback | Built using pure CSS 3D + GSAP (README option C). Visual check done in a browser harness, **real scroll behaviour must be tried on a device** |
| AI assistant v1: FAQ + product search + pincode answers, free Gemini tier + optional fallback provider, rule-based mode with no AI, PII redaction, rate/daily limits | Built (uses retrieval-then-answer, not a tool loop). **Needs real key test** |
| Static/legal pages (shipping, returns, privacy, terms) | **DRAFT templates with [placeholders]: owner and legal review required** |
| Tests: 53 unit tests, Playwright e2e (written), CI workflow | Unit tests pass. e2e/CI **not yet run** |
| Not built yet (backlog) | Manual UPI QR fallback, coupons, reviews, blog, customer accounts / phone OTP, email/WhatsApp notifications, image upload (use Cloudinary URLs for now), chat logs/feedback, strict CSP, shared (Redis) rate limiting, regional languages, real 3D model / 360 viewer |

Brand assets in `public/brand` were cut from the supplied PNG logos. A true vector (SVG) logo is still recommended.

---

**by Krishana Art Palace** · Sheesham wood furniture · Online store (India)

> Status: Planning → Sprint 0
> Domain: `raazwood.<tld>` (to be purchased) · Hosting: Vercel (free tier)

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

---

## 1A. Confirmed Decisions (v2)

- **Payments:** UPI via **Razorpay** (gateway, webhook-verified). Manual UPI QR kept only as a fallback.
- **Market:** Pan-India delivery **including Rajasthan**. Primary audience / SEO focus: **South India** (Telangana, Andhra Pradesh, Karnataka, Tamil Nadu, Kerala). Serviceable states/pincodes are controlled from admin via `PincodeZone`.
- **Catalogue size:** ~50 products, ~100 listings (single piece + "Set of 2" bundles). Hard cap ~100 for launch.
- **Tax:** GST-registered seller. Orders outside Rajasthan are interstate (**IGST**); orders within Rajasthan are intra-state (**CGST + SGST**). Tax type is decided automatically from the delivery state. Prices are shown **GST-inclusive**, and the system generates a tax invoice record for every order (needed for your accounts, Razorpay reconciliation and returns). Rates/HSN to be confirmed with your CA.
- **Brand:** Logo supplied (hexagon tree mark + RAAZWOOD wordmark), brand colour `#AB8D69`. See §1B.
- **Scale implication:** with only ~100 listings, no heavy search engine is needed. Postgres full-text search + category filters are enough. Most product pages can be statically generated (ISR), which is great for speed and SEO.
- **Bundles:** "Set of 2" modelled as a variant with `packQty = 2` (own SKU, price, stock, weight, shipping), with its own SEO page or a variant selector on the main product page (decide in Sprint 1).

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
| Images | **Cloudinary** (free tier) or **Bunny.net Storage + CDN** | Auto resize/WebP/AVIF. Bunny is cheap and fast but is pay-as-you-go (small minimum), not truly free — decide in Sprint 0. |
| Auth | **Auth.js** — customers: phone OTP / email; admin: email + password (+2FA later) | Indian users prefer mobile OTP. Guest checkout allowed. |
| Payments | **UPI** — see §6 | Abstracted behind a `PaymentProvider` interface. |
| Styling | **Tailwind CSS + shadcn/ui** | Fast, accessible components. |
| AI assistant | **Free-tier LLM API (default: Google Gemini API free tier)** behind a provider-agnostic adapter, Vercel AI SDK, tool calling + streaming | Customer help chat grounded in live catalogue and policies, at zero cost to start. See §3B. |
| Animation / 3D | **GSAP + ScrollTrigger, Framer Motion, Lenis, three.js (R3F)** | Scroll-driven hero, logo intro, micro-interactions. See §3A. |
| Validation | **Zod** | Shared schemas for client + server. |
| Email / SMS / WhatsApp | Resend (email), MSG91 / WhatsApp Cloud API (OTP, order updates) | Order confirmation + status updates. |
| Monitoring | Vercel Analytics, Sentry (errors), Google Search Console, GA4 | |
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

### 3.2A AI assistant (customer help)
Site-wide chat assistant for product advice, delivery/pincode, payment help, order tracking, policies and human handover. Full spec in §3B.

### 3.3 Later sprints (backlog)
Cards/net banking/COD · reviews with photos · abandoned-cart reminders · shipping partner integration (Shiprocket etc.) · multi-warehouse · Hindi language · loyalty/referrals · Google Merchant Center feed · PWA.

---

## 3A. Animation & Motion Design (Experience Layer)

**Goal:** a premium, immersive, animated store that makes visitors stay longer and explore more, **without hurting speed or SEO**.

### 3A.1 Intro / Logo animation (on first open)
- Full-screen intro with the Raazwood logo drawing itself (SVG stroke animation): hexagon, tree branches grow, then the wordmark appears.
- **The two "O"s in RAAZWOOD move toward each other and merge into an infinity (∞) loop, pulse once, then settle back into the wordmark.** The logo then shrinks and flies into the header position.
- Duration about 2.5-3 s. **Skip button** always visible. Plays **once per session** (`sessionStorage`), so returning visitors and page navigation are not slowed down.
- Page content is already rendered underneath (server-rendered) so crawlers and users on slow networks are never blocked by the intro.
- Needs a **vector (SVG) logo with separate paths for each letter** (see §1B).

### 3A.2 Scroll-driven Hero Section
Sequence (pinned section, scroll controls the animation):

1. **Stage 1 (top view):** wooden table seen from the top, with the logo / brand text (`RAAZWOOD`, tagline) engraved or printed on the table top.
2. **Stage 2 (scroll):** camera tilts down smoothly and the table rotates into a **3D front/perspective view**, legs and details revealed. Headline, short text and CTA ("Shop Now") fade in.
3. **Stage 3 (a little more scroll):** hero unpins and the table moves out as the next section (categories / bestsellers) slides in. Normal scrolling resumes.

Implementation options (decide in Sprint 0 with a quick prototype):

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Real 3D model** (recommended if a model is available) | `three.js` + `@react-three/fiber` + `drei`, GLB model (Draco-compressed, under 1.5 MB), camera animated by GSAP ScrollTrigger | True 3D, reusable for product 360° views later | Needs a 3D model of a table; heavier on low-end phones |
| **B. Image sequence on canvas** | 60-90 pre-rendered WebP frames (top view to front view), drawn on `<canvas>` according to scroll position | Looks identical on every device, light on GPU, very reliable | Needs a render (Blender) or photo set; frame download size (about 1-2 MB with WebP, lazy loaded) |
| **C. CSS 3D transform** | Table-top and front photos using `perspective` + `rotateX` | Lightest, no extra library | Less realistic |

Rules for any option:
- **Fallback:** low-end devices, `Save-Data`, slow network or `prefers-reduced-motion` get a static hero image (or option C) automatically.
- The hero **`<h1>`, tagline and CTA are real HTML text** (not inside canvas/image), so Google can read them.
- Hero poster image is preloaded and is the **LCP element**. The 3D/canvas layer loads lazily after first paint.

### 3A.3 Site-wide animations
- Smooth scrolling (Lenis) and scroll-reveal for sections, cards and headings (fade/slide/stagger)
- Product cards: hover zoom, second-image swap, quick "Add to cart" slide-up, wishlist heart pop
- Category tiles with parallax; horizontal-scroll "Bestsellers" strip
- Animated counters/trust badges (Pan-India delivery, solid sheesham, years of craft)
- Product page: image zoom, optional **360° / 3D viewer** (later sprint), sticky add-to-cart bar, animated price/discount tag
- Cart: slide-in mini cart drawer, "flying to cart" animation, animated progress bar for free-delivery threshold
- Checkout: step transitions, success animation (check mark / confetti) on order confirmation
- Page transitions between routes (View Transitions API / Framer Motion), skeleton loaders, micro-interactions on buttons and inputs
- Custom cursor and magnetic buttons on desktop only
- Subtle wood-grain / cream textured backgrounds, no heavy autoplay video

### 3A.4 Animation tech stack
| Need | Library |
|---|---|
| Scroll timelines, pinning, SVG draw/morph | **GSAP + ScrollTrigger** (free for use) |
| React component animation, page transitions | **Framer Motion (Motion)** |
| Smooth scrolling | **Lenis** |
| 3D | **three.js + @react-three/fiber + drei** (lazy loaded, client-only) |
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
- Device tiering: detect GPU/CPU (`navigator.hardwareConcurrency`, `deviceMemory`) and serve Full / Lite / Static experience

### 3A.6 Engagement targets
Track with GA4 / Vercel Analytics: average engagement time, scroll depth, bounce rate, product views per session, add-to-cart rate. A/B test intro on/off and hero variants in later sprints. **If animation reduces conversion or Core Web Vitals, tone it down: engagement is only useful if it leads to orders.**

### 3A.7 Assets needed
- [ ] SVG logo with separate letter paths (for the "OO to infinity" animation)
- [ ] Table 3D model (GLB) **or** a Blender render / photo set for the frame sequence
- [ ] Logo/text mock for engraving on the table top
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

### Suggested folder structure
```
raazwood/
├─ src/
│  ├─ app/
│  │  ├─ (store)/            # public pages
│  │  │  ├─ page.tsx
│  │  │  ├─ [category]/page.tsx
│  │  │  ├─ product/[slug]/page.tsx
│  │  │  ├─ cart/ checkout/ order/[id]/
│  │  │  └─ blog/[slug]/
│  │  ├─ (admin)/admin/      # protected admin
│  │  ├─ api/                # route handlers, webhooks
│  │  ├─ sitemap.ts
│  │  ├─ robots.ts
│  │  └─ layout.tsx
│  ├─ components/
│  ├─ lib/                   # db, auth, payments, seo, utils
│  ├─ server/                # services (orders, inventory, payments)
│  ├─ schemas/               # zod
│  └─ styles/
├─ prisma/ (schema.prisma, migrations, seed.ts)
├─ tests/ (unit, integration, e2e)
├─ public/
├─ .github/workflows/
└─ README.md
```

---

## 5. Data Model (core tables)

`User`, `Address`, `Category`, `Product`, `ProductVariant` (size/finish/SKU/price/stock), `ProductImage`, `Cart`, `CartItem`, `Wishlist`, `Order`, `OrderItem`, `Payment`, `Shipment`, `Coupon`, `Review`, `BlogPost`, `AdminUser`, `AuditLog`, `PincodeZone` (serviceability + shipping rate), `ChatSession`, `ChatMessage`, `Handoff`/`Lead`, `KnowledgeArticle` (FAQs/policies for the assistant).

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
- `PaymentProvider` interface: `createPayment()`, `verify()`, `handleWebhook()`, `refund()`
- Order created as `PENDING_PAYMENT`; only becomes `PAID` after verified confirmation (never trust the client redirect)
- Webhook signature verification + idempotency keys (no double processing)
- Payment timeout & retry flow; failed/abandoned handling
- Amount tamper protection (server recalculates totals)
- Daily reconciliation report in admin
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
| **0.5** | Motion prototype | SVG logo animation (OO to infinity), scroll-hero prototype (pick option A/B/C), performance budget, reduced-motion + device tiering |
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
| Unit | Vitest | Price/GST/shipping calc, coupon logic, stock logic, utils |
| Component | React Testing Library | Cart, forms, filters |
| Integration | Vitest + test DB (Neon branch / Docker Postgres) | API routes, services, webhooks |
| E2E | Playwright | Browse → cart → checkout → UPI (mock) → order; admin flows; mobile viewport |
| Payment | Provider sandbox/test mode | Success, failure, timeout, duplicate webhook, tampered amount |
| Accessibility | axe + Lighthouse | WCAG 2.1 AA target |
| Performance | Lighthouse CI, (k6 for load) | Web Vitals budgets, checkout under load |
| SEO | Lighthouse SEO + custom script, Rich Results Test | Meta, schema, sitemap validity |
| Security | `npm audit`, OWASP ZAP baseline, manual review | See §10 |
| AI assistant | Eval set of 100+ real customer questions (English/Hinglish/regional), automated checks + manual review; red-team prompts | Correct prices/stock/delivery (no hallucination), tool-call correctness, prompt-injection and data-leak attempts, handover flow, rate limit/budget cap, API-down fallback |
| Animation / motion | Playwright + Chrome DevTools traces, Lighthouse CI, real mid-range Android test | 60 fps check, reduced-motion mode, skip intro, fallbacks, CLS/LCP with animation on |
| Cross-browser/device | Playwright (Chromium/Firefox/WebKit) + real Android/iPhone check | |
| UAT | Owner walkthrough with checklist before each release | |

CI pipeline (GitHub Actions): install → lint → typecheck → unit/integration → build → E2E on preview → Lighthouse CI.

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

## 11. Environment Variables (`.env.example`)

```
DATABASE_URL=
DIRECT_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
NEXT_PUBLIC_SITE_URL=https://raazwood.<tld>

# Images
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Payments
PAYMENT_PROVIDER=razorpay            # or manual_upi
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
UPI_VPA=                              # for manual UPI option
UPI_PAYEE_NAME=Krishana Art Palace

# Messaging
RESEND_API_KEY=
MSG91_AUTH_KEY=
WHATSAPP_NUMBER=

# AI assistant
ASSISTANT_PROVIDER=gemini              # gemini | groq | openrouter | ...
ASSISTANT_MODEL=                       # a free-tier model from the provider's current list
GEMINI_API_KEY=                        # from Google AI Studio (free)
ASSISTANT_FALLBACK_PROVIDER=
ASSISTANT_FALLBACK_API_KEY=
ASSISTANT_DAILY_REQUEST_CAP=           # stay under free-tier limits, then rule-based fallback
TURNSTILE_SECRET_KEY=

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_GA_ID=
```

---

## 12. Getting Started (after Sprint 0 setup)

```bash
git clone <repo-url> && cd raazwood
cp .env.example .env.local
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev          # http://localhost:3000
```

Scripts: `dev` · `build` · `start` · `lint` · `typecheck` · `test` · `test:e2e` · `lighthouse` · `db:migrate` · `db:seed`

**Git workflow:** `main` (production) ← `develop` ← `feature/*`. Conventional commits (`feat:`, `fix:`, `chore:`). PRs require passing CI + 1 review (self-review checklist if solo).

**Deploy:** push to `main` → Vercel production; PRs → preview URLs. DB migrations run via `prisma migrate deploy` in the build step.

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

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Free-tier limits / commercial-use terms | Monitor usage; budget for Vercel Pro + paid DB tier; keep DB portable (standard Postgres) |
| UPI payment mismatch / double payment | Webhook + idempotency + admin reconciliation |
| Large furniture shipping complexity & damage | Pincode-based rates, clear delivery/return policy, packaging notes |
| Poor product photos hurt conversion & SEO | Photo guidelines, image optimisation |
| Overselling stock | Transactional stock reservation |
| Heavy animation/3D slows site on low-end phones, hurts SEO | Lazy loading, device tiering, static fallback, JS budget in CI, Lighthouse gate |
| Missing 3D model / vector logo delays hero | Decide option A/B/C in Sprint 0.5; start with image-sequence fallback |
| AI assistant gives a wrong price/policy or leaks data | Tool-grounded answers only, server-side validation, verification before order data, eval set in CI, human handover |
| Free-tier limits hit, model/terms change, or content used for provider training | Reply cache, rate limits, fallback provider + rule-based mode, adapter to switch vendor, no personal data sent to LLM |
| Scope creep | Strict sprint backlog; new ideas go to backlog |

---

## 15. License
Private / proprietary — © Krishana Art Palace (Raazwood). All rights reserved.
