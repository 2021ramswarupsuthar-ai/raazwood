import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import JsonLd from '@/components/JsonLd';
import { getCategory, listProducts } from '@/server/catalog';
import { breadcrumbJsonLd } from '@/lib/seo';

export const revalidate = 1800;
type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategory(slug).catch(() => null);
  if (!c) return { title: 'Category not found', robots: { index: false } };
  return {
    title: c.seoTitle ?? `${c.name} in Solid Sheesham Wood`,
    description: c.seoDesc ?? (c.description || `Shop ${c.name.toLowerCase()} in solid sheesham wood. Delivered across India. Pay by UPI.`).slice(0, 160),
    alternates: { canonical: `/c/${c.slug}` },
  };
}

export default async function Category({ params }: { params: P }) {
  const { slug } = await params;
  const cat = await getCategory(slug).catch(() => null);
  if (!cat) notFound();
  const products = await listProducts({ categorySlug: slug });
  return (
    <div className="container-x py-12">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: cat.name, path: `/c/${cat.slug}` }])} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink/60"><Link href="/" className="hover:text-brand-dark">Home</Link> / <Link href="/shop" className="hover:text-brand-dark">Shop</Link> / {cat.name}</nav>
      <h1 className="h-display mt-3 text-4xl md:text-5xl">{cat.name}</h1>
      {cat.description && <p className="mt-3 max-w-2xl text-ink/75">{cat.description}</p>}
      {products.length === 0 ? <p className="mt-12 text-ink/70">No products in this category yet.</p> : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, i) => (<Reveal as="li" key={p.id} delay={(i % 4) * 70}><ProductCard p={p} priority={i < 4} /></Reveal>))}
        </ul>
      )}
    </div>
  );
}
