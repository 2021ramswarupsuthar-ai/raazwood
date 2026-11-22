import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { STORE } from '@/config/store';

export const metadata: Metadata = { title: 'Terms of sale', description: 'Terms and conditions for buying from Raazwood.', alternates: { canonical: '/terms' } };

// DRAFT TEMPLATE: review with a legal advisor. Include grievance officer details as required for e-commerce in India.
export default function Terms() {
  return (
    <LegalPage title="Terms of sale" intro={`These terms apply to purchases from ${STORE.name}, a brand of ${STORE.legalName}.`}>
      <h2>Prices and payment</h2>
      <p>All prices are in Indian Rupees and include GST unless stated. Payment is by UPI through Razorpay. An order is confirmed only after payment is received.</p>
      <h2>Product information</h2>
      <p>Wood is a natural material: grain, colour and finish vary between pieces and photographs may differ slightly from the actual product.</p>
      <h2>Delivery, returns and refunds</h2>
      <p>See our Shipping &amp; delivery policy and Returns, cancellation &amp; refund policy.</p>
      <h2>Grievance officer</h2>
      <p>[Name, designation, email and phone of your grievance officer, and the time within which complaints are acknowledged and resolved.]</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India. [Add jurisdiction.]</p>
    </LegalPage>
  );
}
