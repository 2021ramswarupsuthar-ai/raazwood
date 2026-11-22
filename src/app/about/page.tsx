import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { STORE } from '@/config/store';

export const metadata: Metadata = { title: 'About Raazwood', description: 'Raazwood is the online furniture brand of Krishana Art Palace, offering solid sheesham wood furniture delivered across India.', alternates: { canonical: '/about' } };

export default function About() {
  return (
    <LegalPage title="About Raazwood" intro={`Raazwood is a brand of ${STORE.legalName}, bringing solid sheesham wood furniture to homes across India.`}>
      {/* EDIT: add your real story: family/workshop history, years in business, where the furniture is made, craftsmen. Real details help trust and SEO. */}
      <p>We make and sell furniture in solid sheesham (Indian rosewood): beds, sofas, dining sets, wardrobes and more. Every product page lists the material, finish and dimensions so you know exactly what you are buying.</p>
      <h2>How we work</h2>
      <ul><li>Clear prices, inclusive of GST</li><li>Delivery charge and estimated time shown for your pincode before you pay</li><li>Secure UPI payment through Razorpay</li><li>Our team is available on WhatsApp for questions and custom requirements</li></ul>
    </LegalPage>
  );
}
