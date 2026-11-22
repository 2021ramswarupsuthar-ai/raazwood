import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Returns, cancellation & refund policy', description: 'Raazwood returns, cancellation and refund policy for solid sheesham furniture orders.', alternates: { canonical: '/returns-policy' } };

// DRAFT TEMPLATE: the owner must decide the real terms. Items in [brackets] must be filled in.
export default function Returns() {
  return (
    <LegalPage title="Returns, cancellation & refund policy" intro="We want you to be happy with your furniture. Here is how returns and refunds work.">
      <h2>Cancellation</h2>
      <p>You can cancel an order before it is dispatched by contacting us on WhatsApp with your order reference. [Describe any charges.]</p>
      <h2>Damaged or wrong item</h2>
      <p>If your item arrives damaged, defective or different from what you ordered, contact us within [X days] of delivery with photos/video. We will arrange a repair, replacement or refund as applicable.</p>
      <h2>Returns</h2>
      <p>[State whether change-of-mind returns are accepted, the time window, condition requirements and who pays return freight. Made-to-order and customised items are usually non-returnable.]</p>
      <h2>Refunds</h2>
      <p>Approved refunds are made to the original payment method (UPI) within [X working days] of approval.</p>
    </LegalPage>
  );
}
