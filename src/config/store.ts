// Central store configuration. Values marked EDIT are business decisions, not facts:
// please review them with the owner before launch.
export const STORE = {
  name: 'Raazwood',
  legalName: 'Krishana Art Palace',
  tagline: 'Solid sheesham wood furniture, delivered across India',
  // EDIT: contact details (shown in footer, contact page and JSON-LD)
  phone: process.env.NEXT_PUBLIC_PHONE ?? '+91 00000 00000',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? '910000000000', // digits only, with country code
  email: process.env.NEXT_PUBLIC_EMAIL ?? 'hello@raazwood.example',
  address: process.env.NEXT_PUBLIC_ADDRESS ?? 'Krishana Art Palace, Rajasthan, India',
  sellerStateCode: (process.env.SELLER_STATE_CODE ?? 'RJ').toUpperCase(),
  gstin: process.env.SELLER_GSTIN ?? '',
  defaultGstRate: Number(process.env.DEFAULT_GST_RATE ?? 18), // EDIT: confirm HSN + rate with your CA
  freeShippingAbovePaise: Number(process.env.FREE_SHIPPING_ABOVE_PAISE ?? 0), // 0 = disabled
  orderExpiryMinutes: Number(process.env.ORDER_EXPIRY_MINUTES ?? 30),
} as const;

// States where most customers are (used for SEO landing pages and delivery messaging).
export const SOUTH_STATES = ['TS', 'AP', 'KA', 'TN', 'KL', 'PY'] as const;

// EDIT: placeholder delivery estimates (days) per zone. Replace with your real courier/freight timelines.
export const DELIVERY_DAYS = {
  south: { min: 7, max: 12 },
  other: { min: 8, max: 14 },
} as const;

// States you deliver to. Default: everywhere. Restrict by setting SERVICEABLE_STATES="TS,AP,KA,..."
export const SERVICEABLE_STATES: string[] | 'ALL' = process.env.SERVICEABLE_STATES
  ? process.env.SERVICEABLE_STATES.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  : 'ALL';

// Trust points shown in the top bar, the strip under the hero and on product pages.
// Only facts that are always true for this store are listed here. Add warranty / return terms through the
// optional env variables below ONLY after the owner has decided them (they appear next to the claims).
export const USPS = [
  { key: 'wood', title: '100% solid sheesham', text: 'Real wood, not veneer on board' },
  { key: 'delivery', title: 'Delivery across India', text: 'See charge and days for your pincode' },
  { key: 'pay', title: 'Secure UPI payment', text: 'Pay with any UPI app' },
  { key: 'help', title: 'Help on WhatsApp', text: 'Custom sizes and questions' },
] as const;

export const POLICY = {
  // e.g. NEXT_PUBLIC_WARRANTY_TEXT="10-year warranty against termite and borer"  (leave empty to hide)
  warranty: process.env.NEXT_PUBLIC_WARRANTY_TEXT ?? '',
  // e.g. NEXT_PUBLIC_RETURNS_TEXT="7-day replacement for transit damage"
  returns: process.env.NEXT_PUBLIC_RETURNS_TEXT ?? '',
  // top announcement bar, e.g. NEXT_PUBLIC_OFFER_BANNER="Festive sale: use code SAMPLE10 for 10% off"
  offerBanner: process.env.NEXT_PUBLIC_OFFER_BANNER ?? '',
} as const;
