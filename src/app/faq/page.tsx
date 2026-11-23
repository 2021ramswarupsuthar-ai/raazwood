import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { FAQS } from '@/config/faq';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { STORE } from '@/config/store';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Answers about solid sheesham wood furniture, delivery across India, UPI payment, GST invoices, orders and care.',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  const topics = [...new Set(FAQS.map((f) => f.topic))];
  return (
    <div className="container-x max-w-3xl py-12">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }])} />
      <JsonLd data={faqJsonLd(FAQS)} />
      <p className="eyebrow">Help</p>
      <h1 className="h-display mt-2 text-4xl md:text-5xl">Frequently asked questions</h1>
      {topics.map((t) => (
        <section key={t} className="mt-10" aria-labelledby={`t-${t}`}>
          <h2 id={`t-${t}`} className="font-display text-2xl font-semibold">{t}</h2>
          <div className="mt-3 divide-y divide-line rounded-2xl bg-white ring-1 ring-line/70">
            {FAQS.filter((f) => f.topic === t).map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.q}<span className="text-brand-dark transition group-open:rotate-45" aria-hidden="true">+</span></summary>
                <p className="mt-3 text-sm leading-relaxed text-ink/75">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      <p className="mt-10 text-ink/75">Still have a question? <a href={`https://wa.me/${STORE.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-brand-dark underline">Message us on WhatsApp</a> or see our <Link href="/contact" className="text-brand-dark underline">contact page</Link>.</p>
    </div>
  );
}
