import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PincodeChecker from '@/components/PincodeChecker';
import ProductCard from '@/components/ProductCard';
import JsonLd from '@/components/JsonLd';
import { CITIES } from '@/config/cities';
import { DELIVERY_DAYS } from '@/config/store';
import { listProducts } from '@/server/catalog';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';

export const revalidate = 3600;
export const dynamicParams = false;
export const generateStaticParams = () => CITIES.map((c) => ({ city: c.slug }));
type P = Promise<{ city: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { city } = await params;
  const c = CITIES.find((x) => x.slug === city);
  if (!c) return {};
  return {
    title: `Solid Sheesham Wood Furniture in ${c.name} | Delivered to ${c.stateName}`,
    description: `Buy solid sheesham wood beds, sofas and dining sets online with delivery to ${c.name}, ${c.stateName}. Check delivery time for your pincode. Pay by UPI.`,
    alternates: { canonical: `/furniture-in/${c.slug}` },
  };
}

export default async function CityPage({ params }: { params: P }) {
  const { city } = await params;
  const c = CITIES.find((x) => x.slug === city);
  if (!c) notFound();
  const products = await listProducts({ featured: true, take: 4 }).catch(() => []);
  const faqs = [
    { q: `Do you deliver furniture to ${c.name}?`, a: `Yes, we deliver across India including ${c.name} and the rest of ${c.stateName}. Enter your pincode to see the delivery charge and estimated time.` },
    { q: `How long does delivery to ${c.name} take?`, a: `Estimated delivery is about ${DELIVERY_DAYS.south.min}-${DELIVERY_DAYS.south.max} days after dispatch. This is indicative and shown again at checkout for your exact pincode.` },
    { q: 'Is the furniture solid sheesham wood?', a: 'Yes. Each product page lists the material, finish and dimensions.' },
  ];
  return (
    <div className="container-x py-12">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: `Furniture in ${c.name}`, path: `/furniture-in/${c.slug}` }])} />
      <JsonLd data={faqJsonLd(faqs)} />
      <p className="eyebrow">{c.stateName}</p>
      <h1 className="h-display mt-2 text-4xl md:text-5xl">Solid sheesham wood furniture in {c.name}</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink/75">Shop beds, sofas, dining sets and more from Raazwood, delivered to {c.name}. Pay securely by UPI and see the delivery time for your pincode before you order.</p>
      {c.notes && <p className="mt-3 max-w-2xl text-ink/75">{c.notes}</p>}
      <div className="mt-8 max-w-md rounded-2xl bg-white p-5 ring-1 ring-line/70"><PincodeChecker /></div>
      {products.length > 0 && (<><h2 className="mt-14 font-display text-3xl font-semibold">Popular with customers in {c.stateName}</h2><ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{products.map((p) => <li key={p.id}><ProductCard p={p} /></li>)}</ul></>)}
      <h2 className="mt-14 font-display text-3xl font-semibold">Delivery to {c.name}: common questions</h2>
      <div className="mt-4 divide-y divide-line rounded-2xl bg-white ring-1 ring-line/70">{faqs.map((f) => (<details key={f.q} className="px-5 py-4"><summary className="cursor-pointer font-medium">{f.q}</summary><p className="mt-2 text-sm text-ink/75">{f.a}</p></details>))}</div>
      <p className="mt-8"><Link href="/shop" className="btn btn-primary">Shop all furniture</Link></p>
    </div>
  );
}
