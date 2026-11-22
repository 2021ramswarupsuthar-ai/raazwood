import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Shipping & delivery policy', description: 'How Raazwood delivers solid sheesham furniture across India: charges, timelines and what to check on delivery.', alternates: { canonical: '/shipping-policy' } };

// DRAFT TEMPLATE: review every line with the owner (and a legal advisor) before launch. Items in [brackets] must be filled in.
export default function Shipping() {
  return (
    <LegalPage title="Shipping & delivery policy" intro="We deliver across India. This page explains how delivery works.">
      <h2>Delivery charges and time</h2>
      <p>The delivery charge and an estimated delivery time are shown on the product page and at checkout once you enter your pincode and state. Estimates are indicative and may vary with the courier or freight partner, weather and local conditions. Typical dispatch time after payment: [X working days].</p>
      <h2>On delivery</h2>
      <ul><li>Please check the packaging before accepting delivery and note any visible damage with the delivery person.</li><li>We recommend recording a short unboxing video.</li><li>Report any damage or missing parts within [X days] of delivery on WhatsApp with photos and your order reference.</li></ul>
      <h2>Assembly</h2>
      <p>[Describe whether assembly is included, how it is arranged, and any charges.]</p>
      <h2>Areas we deliver to</h2>
      <p>We currently deliver to [all states / list of states]. If we cannot deliver to your pincode you will see a message at checkout before you pay.</p>
    </LegalPage>
  );
}
