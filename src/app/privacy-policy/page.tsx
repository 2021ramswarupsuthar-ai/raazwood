import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { STORE } from '@/config/store';

export const metadata: Metadata = { title: 'Privacy policy', description: 'How Raazwood collects, uses and protects your personal data.', alternates: { canonical: '/privacy-policy' } };

// DRAFT TEMPLATE aligned with the product's actual behaviour. Have a legal advisor review it (DPDP Act 2023) before launch.
export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" intro={`${STORE.legalName} (“we”) respects your privacy. This policy explains what we collect and why.`}>
      <h2>What we collect</h2>
      <ul><li>Order details: name, mobile number, email (optional), delivery address.</li><li>Payment status from Razorpay. We never see or store your UPI PIN or bank details.</li><li>Basic usage data (pages visited) to improve the site.</li></ul>
      <h2>How we use it</h2>
      <p>To process and deliver your order, send order updates, provide support, issue tax invoices and meet legal requirements.</p>
      <h2>AI assistant</h2>
      <p>Our chat assistant may use a third-party AI service to answer product and delivery questions. We remove phone numbers, emails and similar details from messages before they are sent, and ask you not to share personal or payment details in the chat.</p>
      <h2>Sharing</h2>
      <p>We share data only with service providers needed to fulfil your order (payment processor, courier/freight partners, hosting) and where required by law.</p>
      <h2>Your rights</h2>
      <p>You can ask us to access, correct or delete your personal data by writing to {STORE.email}. We keep order and invoice records for as long as the law requires.</p>
    </LegalPage>
  );
}
