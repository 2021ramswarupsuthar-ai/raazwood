// Rule-based layer of the assistant: FAQ matching, pincode detection, PII redaction.
// Works with NO external AI, and also prepares safe context for the LLM.

export type Faq = { id: string; keywords: string[]; question: string; answer: string };

// EDIT: answers are intentionally generic and point to the policy pages. Replace with your real policies.
export const FAQS: Faq[] = [
  {
    id: 'payment',
    keywords: ['payment', 'pay', 'upi', 'gpay', 'phonepe', 'paytm', 'razorpay', 'failed', 'debited', 'refund money'],
    question: 'How can I pay?',
    answer:
      'You can pay securely by UPI (Google Pay, PhonePe, Paytm and others) through Razorpay at checkout. If money was debited but your order shows pending, please wait a few minutes: it is confirmed automatically. If it is still pending, message us on WhatsApp with your order number.',
  },
  {
    id: 'delivery',
    keywords: ['delivery', 'deliver', 'shipping', 'ship', 'charges', 'days', 'time', 'when will', 'arrive', 'pincode'],
    question: 'How does delivery work?',
    answer:
      'We deliver across India. Enter your pincode on any product page or at checkout to see the delivery charge and estimated delivery time for your location. Estimates are indicative and can vary with the courier or freight partner.',
  },
  {
    id: 'returns',
    keywords: ['return', 'refund', 'exchange', 'cancel', 'cancellation', 'damaged', 'broken', 'replace'],
    question: 'What is the return / cancellation policy?',
    answer:
      'Please read our Returns & Refund policy page for the current terms. If your furniture arrives damaged, take photos/video while unboxing and contact us on WhatsApp immediately with your order number so we can help.',
  },
  {
    id: 'material',
    keywords: ['sheesham', 'wood', 'material', 'solid', 'teak', 'quality', 'polish', 'finish', 'care', 'clean', 'termite'],
    question: 'What wood do you use and how do I care for it?',
    answer:
      'Our furniture is made from sheesham (Indian rosewood). Wipe with a dry or slightly damp soft cloth, avoid standing water and direct heat, and keep it away from prolonged direct sunlight. Each product page lists its specific material and finish.',
  },
  {
    id: 'assembly',
    keywords: ['assembly', 'assemble', 'install', 'installation', 'fitting', 'carpenter'],
    question: 'Does the furniture need assembly?',
    answer:
      'Assembly details are mentioned on each product page. If you are unsure about a specific product, ask us on WhatsApp and we will confirm.',
  },
  {
    id: 'gst',
    keywords: ['gst', 'invoice', 'bill', 'tax'],
    question: 'Do prices include GST? Will I get an invoice?',
    answer:
      'Prices shown include GST. A tax invoice is available for your order once payment is confirmed.',
  },
  {
    id: 'custom',
    keywords: ['custom', 'customize', 'customise', 'size', 'bulk', 'dimension', 'made to order', 'different size'],
    question: 'Can I get a custom size or a bulk order?',
    answer:
      'For custom sizes or bulk orders, message us on WhatsApp with the product and the size you need, and we will get back to you with options.',
  },
  {
    id: 'contact',
    keywords: ['contact', 'call', 'phone', 'whatsapp', 'human', 'support', 'help', 'talk', 'agent', 'owner'],
    question: 'How can I talk to someone?',
    answer: 'You can reach us on WhatsApp or by phone from the Contact page. We are happy to help.',
  },
];

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'do', 'you', 'i', 'my', 'to', 'for', 'of', 'in', 'on', 'it', 'me', 'can', 'how', 'what', 'will']);

export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\u0900-\u0D7F\s]/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));
}

export function matchFaq(query: string): Faq | null {
  const q = query.toLowerCase();
  const tokens = new Set(tokenize(query));
  let best: { faq: Faq; score: number } | null = null;
  for (const faq of FAQS) {
    let score = 0;
    for (const k of faq.keywords) {
      if (k.includes(' ') ? q.includes(k) : tokens.has(k)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { faq, score };
  }
  return best ? best.faq : null;
}

export function extractPincode(text: string): string | null {
  const m = text.match(/(?<![0-9])[1-9][0-9]{5}(?![0-9])/);
  return m ? m[0] : null;
}

/** Remove personal data before text is sent to any external AI provider. */
export function redactPII(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?:\+?91[\s-]?)?[6-9][0-9]{4}[\s-]?[0-9]{5}(?![0-9])/g, '[phone]')
    .replace(/\b(?:otp|pin|cvv|password)\b\s*(?:is|:)?\s*[0-9]{3,8}\b/gi, '[secret]');
}

export function clampMessage(text: string, max = 500): string {
  return text.slice(0, max).trim();
}

const SYNONYMS: Record<string, string> = { cot: 'bed', khat: 'bed', palang: 'bed', couch: 'sofa', settee: 'sofa', almirah: 'wardrobe', cupboard: 'wardrobe', dining: 'dining', table: 'table' };
const stem = (t: string) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t);

/** Rank products against a free-text query (name, category, short description). Pure and unit-tested. */
export function rankProducts<T extends { name: string; category: string; shortDesc?: string }>(query: string, items: T[], limit = 4): T[] {
  const qt = tokenize(query).map((t) => SYNONYMS[t] ?? stem(t)).filter((t) => t.length > 2);
  if (!qt.length) return [];
  const scored = items
    .map((it) => {
      const nameT = tokenize(it.name).map(stem);
      const catT = tokenize(it.category).map(stem);
      const descT = tokenize(it.shortDesc ?? '').map(stem);
      let s = 0;
      for (const t of qt) {
        if (nameT.includes(t)) s += 3;
        if (catT.includes(t)) s += 2;
        if (descT.includes(t)) s += 1;
      }
      return { it, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.it);
}
