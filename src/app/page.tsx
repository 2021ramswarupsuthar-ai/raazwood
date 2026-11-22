import Link from 'next/link';
import Image from 'next/image';
import IntroOverlay from '@/components/IntroOverlay';
import TableHero from '@/components/TableHero';
import Reveal from '@/components/Reveal';
import ProductCard from '@/components/ProductCard';
import PincodeChecker from '@/components/PincodeChecker';
import JsonLd from '@/components/JsonLd';
import { getCategories, listProducts } from '@/server/catalog';
import { faqJsonLd } from '@/lib/seo';

export const revalidate = 3600;

const FAQ = [
  { q: 'Is your furniture made of solid sheesham wood?', a: 'Yes. Our furniture is made from sheesham (Indian rosewood). Each product page lists its exact material and finish.' },
  { q: 'Do you deliver across India?', a: 'Yes. Enter your pincode to see the delivery charge and estimated delivery time for your location.' },
  { q: 'How can I pay?', a: 'You can pay securely by UPI (Google Pay, PhonePe, Paytm and more) through Razorpay at checkout.' },
  { q: 'Can I order a custom size?', a: 'For custom sizes or bulk orders, message us on WhatsApp and we will share options.' },
];

const POINTS = [
  { t: 'Solid sheesham wood', d: 'Real wood, not veneer-on-board. Each piece lists its material, finish and dimensions.' },
  { t: 'Delivered across India', d: 'See delivery charge and estimated time for your pincode before you pay.' },
  { t: 'Secure UPI payments', d: 'Pay with any UPI app. Your order is confirmed automatically.' },
  { t: 'Help on WhatsApp', d: 'Questions on size, finish or custom orders? Talk to our team directly.' },
];

export default async function Home() {
  const [cats, featured] = await Promise.all([getCategories().catch(() => []), listProducts({ featured: true, take: 8 }).catch(() => [])]);
  const items = ['Solid sheesham wood', 'Delivered across India', 'Pay securely by UPI', 'Made to last generations', 'Custom sizes on request'];

  return (
    <>
      <IntroOverlay />
      <TableHero />

      <div className="overflow-hidden border-y border-line bg-walnut py-4 text-brand" aria-hidden="true">
        <div className="marquee font-display text-xl uppercase tracking-[0.25em]">
          {[...items, ...items, ...items, ...items].map((t, i) => (<span key={i} className="flex items-center gap-12 whitespace-nowrap">{t}<span className="text-brand/50">◆</span></span>))}
        </div>
      </div>

      {cats.length > 0 && (
        <section className="container-x pt-20" aria-labelledby="cats">
          <Reveal><p className="eyebrow">Shop by room</p><h2 id="cats" className="h-display mt-2 text-4xl md:text-5xl">Find your piece</h2></Reveal>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((c, i) => (
              <Reveal as="li" key={c.id} delay={i * 80}>
                <Link href={`/c/${c.slug}`} className="pcard group relative block aspect-[5/4] overflow-hidden rounded-2xl bg-walnut">
                  <Image src={c.image ?? '/images/placeholder.svg'} alt="" fill sizes="(min-width:1024px) 33vw, 90vw" className="object-cover opacity-70" unoptimized={(c.image ?? '/images/placeholder.svg').endsWith('.svg')} />
                  <div className="absolute inset-0 bg-gradient-to-t from-walnut/90 via-walnut/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-bone">
                    <h3 className="font-display text-3xl font-semibold">{c.name}</h3>
                    <span className="mt-1 inline-flex items-center gap-2 text-sm text-brand transition group-hover:gap-3">Explore <span aria-hidden="true">→</span></span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {featured.length > 0 && (
        <section className="container-x pt-24" aria-labelledby="feat">
          <Reveal className="flex items-end justify-between gap-4">
            <div><p className="eyebrow">Bestsellers</p><h2 id="feat" className="h-display mt-2 text-4xl md:text-5xl">Loved by our customers</h2></div>
            <Link href="/shop" className="btn btn-ghost hidden sm:inline-flex">View all</Link>
          </Reveal>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p, i) => (<Reveal as="li" key={p.id} delay={(i % 4) * 90}><ProductCard p={p} /></Reveal>))}
          </ul>
        </section>
      )}

      <section className="container-x pt-24" aria-labelledby="why">
        <Reveal><p className="eyebrow">Why Raazwood</p><h2 id="why" className="h-display mt-2 text-4xl md:text-5xl">Furniture you can trust</h2></Reveal>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p, i) => (
            <Reveal as="li" key={p.t} delay={i * 90} className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-line/70">
              <span className="font-display text-5xl text-brand">0{i + 1}</span>
              <h3 className="mt-3 font-display text-2xl font-semibold">{p.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{p.d}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <section id="delivery" className="mt-24 bg-walnut py-20 text-bone" aria-labelledby="deliv">
        <div className="container-x grid items-center gap-10 md:grid-cols-2">
          <Reveal>
            <p className="eyebrow !text-brand">Delivery</p>
            <h2 id="deliv" className="h-display mt-2 text-4xl md:text-5xl">Delivered to your doorstep, wherever you are</h2>
            <p className="mt-4 max-w-md text-bone/75">Hyderabad, Bengaluru, Chennai, Kochi and across India. Enter your pincode to see charges and estimated delivery time.</p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              {['hyderabad', 'bengaluru', 'chennai', 'kochi'].map((c) => (<Link key={c} href={`/furniture-in/${c}`} className="rounded-full border border-brand/40 px-4 py-1.5 capitalize text-brand hover:bg-brand hover:text-walnut">{c}</Link>))}
            </div>
          </Reveal>
          <Reveal delay={120}><div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10"><PincodeChecker dark /></div></Reveal>
        </div>
      </section>

      <section className="container-x max-w-3xl pt-24" aria-labelledby="faq">
        <Reveal><p className="eyebrow">Questions</p><h2 id="faq" className="h-display mt-2 text-4xl md:text-5xl">Good to know</h2></Reveal>
        <div className="mt-8 divide-y divide-line rounded-2xl bg-white ring-1 ring-line/70">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.q}<span className="text-brand-dark transition group-open:rotate-45" aria-hidden="true">+</span></summary>
              <p className="mt-3 text-sm leading-relaxed text-ink/75">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      <JsonLd data={faqJsonLd(FAQ)} />
    </>
  );
}
