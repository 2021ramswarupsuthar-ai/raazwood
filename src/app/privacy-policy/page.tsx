import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { STORE } from '@/config/store';

export const metadata: Metadata = { title: 'Privacy policy', description: 'How Raazwood collects, uses and protects your personal data.', alternates: { canonical: '/privacy-policy' } };

// DRAFT TEMPLATE aligned with the product's actual behaviour. Have a legal advisor review it (DPDP Act 2023) before launch.
export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" intro={`${STORE.legalName} (“we”) respects your privacy. This policy explains what we collect and why.`}>
      <h2>What we collect</h2>
      <ul><li>Order details: name, mobile number, email (optional), delivery address.</li><li>If you create an account: your mobile number (verified with a one-time code), name, email, saved addresses, wishlist and reviews you write. We store only a scrambled (hashed) form of login codes.</li><li>Payment status from our payment processor, or the UPI reference number you give us. We never see or store your UPI PIN or bank details.</li><li>Basic usage data (pages visited) to improve the site, only if you accept analytics cookies.</li></ul>
      <h2>How we use it</h2>
      <p>To process and deliver your order, send order updates, provide support, issue tax invoices and meet legal requirements.</p>
      <h2>Cookies</h2>
      <p>Essential cookies keep your cart and login working and are always on. Analytics cookies (Google Analytics) are used only if you choose “Accept all” in the cookie banner. You can change your choice by clearing this site&apos;s data in your browser.</p>
      <h2>Messages</h2>
      <p>We send order confirmations and delivery updates by SMS, WhatsApp and/or email to the contact details you give at checkout, and login codes by SMS. We do not send marketing messages without your consent.</p>
      <h2>AI assistant</h2>
      <p>Our chat assistant may use a third-party AI service to answer product and delivery questions. We remove phone numbers, emails and similar details from messages before they are sent, and ask you not to share personal or payment details in the chat.</p>
      <h2>Sharing</h2>
      <p>We share data only with service providers needed to fulfil your order (payment processor, courier/freight partners, hosting) and where required by law.</p>
      <h2>Your rights</h2>
      <p>You can ask us to access, correct or delete your personal data by writing to {STORE.email}. Account holders can edit their profile and addresses in My account. We keep order and invoice records for as long as the law requires.</p>
    </LegalPage>
  );
}
