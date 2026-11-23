// Site FAQ (README §3.1 "FAQ" page + FAQPage JSON-LD). EDIT: review the answers with the owner; anything
// about delivery times, returns or warranty must match the policy pages.
export type Faq = { q: string; a: string; topic: 'Products' | 'Delivery' | 'Payment' | 'Orders' | 'Care' };

export const FAQS: Faq[] = [
  { topic: 'Products', q: 'Is your furniture made of solid sheesham wood?', a: 'Yes. Our furniture is made from sheesham (Indian rosewood). Each product page lists its exact material, finish and dimensions.' },
  { topic: 'Products', q: 'Can I order a custom size?', a: 'For custom sizes or bulk orders, message us on WhatsApp with the product and the size you need, and we will share options and pricing.' },
  { topic: 'Products', q: 'What does "Set of 2" mean?', a: 'Some pieces such as stools and side tables are also sold as a pack of two. The pack has its own price, stock and delivery charge, shown when you choose it on the product page.' },
  { topic: 'Delivery', q: 'Do you deliver across India?', a: 'Yes. Enter your pincode on any product page or at checkout to see the delivery charge and estimated delivery time for your location.' },
  { topic: 'Delivery', q: 'How long does delivery take?', a: 'Delivery time depends on your state and is shown for your pincode before you pay. Estimates are indicative and can vary with the courier or freight partner.' },
  { topic: 'Delivery', q: 'Is assembly included?', a: 'Large pieces are packed for safe transport. Please check the product description or ask us on WhatsApp whether assembly is needed for your item.' },
  { topic: 'Payment', q: 'How can I pay?', a: 'You can pay securely by UPI (Google Pay, PhonePe, Paytm and other UPI apps) at checkout.' },
  { topic: 'Payment', q: 'Money was debited but my order shows pending. What should I do?', a: 'Please wait a few minutes: payments are confirmed automatically. If it is still pending, message us on WhatsApp with your order reference and we will check it for you.' },
  { topic: 'Payment', q: 'Do prices include GST? Will I get an invoice?', a: 'Yes. All prices include GST, and a GST tax invoice is available on your order page once the payment is confirmed.' },
  { topic: 'Payment', q: 'Can I use a coupon code?', a: 'Yes. Enter it in the "Coupon code" box at checkout. The discount and the updated total are shown before you pay.' },
  { topic: 'Orders', q: 'How do I track my order?', a: 'Open the order link shown after payment, or log in with your mobile number and go to My account > Orders. Earlier guest orders placed with the same number appear there too.' },
  { topic: 'Orders', q: 'Do I need an account to order?', a: 'No. Guest checkout is always available. An account (login with a one-time code, no password) saves your addresses, wishlist and order history.' },
  { topic: 'Orders', q: 'What if my furniture arrives damaged?', a: 'Take photos or a video while unboxing and contact us on WhatsApp immediately with your order reference. See the Returns & Refund policy for details.' },
  { topic: 'Care', q: 'How do I care for sheesham wood furniture?', a: 'Dust with a soft dry cloth, wipe spills quickly, keep it away from direct sunlight and heat, and use coasters and mats. Polish occasionally with a wood polish suited to the finish.' },
];
