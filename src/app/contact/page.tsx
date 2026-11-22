import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { STORE } from '@/config/store';

export const metadata: Metadata = { title: 'Contact us', description: 'Contact Raazwood by WhatsApp, phone or email for help with orders, delivery and custom furniture.', alternates: { canonical: '/contact' } };

export default function Contact() {
  return (
    <LegalPage title="Contact us" intro="We are happy to help with product questions, delivery, orders and custom sizes.">
      <ul>
        <li>WhatsApp: <a className="text-brand-dark underline" href={`https://wa.me/${STORE.whatsapp}`} target="_blank" rel="noopener noreferrer">Chat with us</a></li>
        <li>Phone: <a className="text-brand-dark underline" href={`tel:${STORE.phone.replace(/\s/g, '')}`}>{STORE.phone}</a></li>
        <li>Email: <a className="text-brand-dark underline" href={`mailto:${STORE.email}`}>{STORE.email}</a></li>
        <li>Address: {STORE.address}</li>
      </ul>
      <p>When writing about an order, please include your order reference (shown on your order page).</p>
    </LegalPage>
  );
}
