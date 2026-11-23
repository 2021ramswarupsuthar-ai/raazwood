import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import JsonLd from '@/components/JsonLd';
import ShopFilters, { Pagination, isFiltered, parseListParams, type ListParams } from '@/components/ShopFilters';
import { getCategory, listProductsPage } from '@/server/catalog';
import { breadcrumbJsonLd } from '@/lib/seo';

export const revalidate = 1800;
type P = Promise<{ slug: string }>;
type SP = Promise<ListParams>;

export async function generateMetadata({ params, searchParams }: { params: P; searchParams: SP }): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const c = await getCategory(slug).catch(() => null);
  if (!c) return { title: 'Category not found', robots: { index: false } };
  return {
    title: c.seoTitle ?? `${c.name} in Solid Sheesham Wood`,
    description: c.seoDesc ?? (c.description || `Shop ${c.name.toLowerCase()} in solid sheesham wood. Delivered across India. Pay by UPI.`).slice(0, 160),
    alternates: { canonical: `/c/${c.slug}` },
    robots: isFiltered(sp) ? { index: false, follow: true } : undefined,
  };
}

export default async function Category({ params, searchParams }: { params: P; searchParams: SP }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const cat = await getCategory(slug).catch(() => null);
  if (!cat) notFound();
  const opts = { ...parseListParams(sp), q: undefined }; // category pages have no text search
  const result = await listProductsPage({ ...opts, categorySlug: slug });
  const base = `/c/${cat.slug}`;
  return (
    <div className="container-x py-12">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: cat.name, path: base }])} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink/60"><Link href="/" className="hover:text-brand-dark">Home</Link> / <Link href="/shop" className="hover:text-brand-dark">Shop</Link> / {cat.name}</nav>
      <h1 className="h-display mt-3 text-4xl md:text-5xl">{cat.name}</h1>
      {cat.description && <p className="mt-3 max-w-2xl text-ink/75">{cat.description}</p>}
      <div className="mt-8"><ShopFilters action={base} sp={{ ...sp, q: undefined }} /></div>
      <p className="mt-4 text-sm text-ink/60" role="status">{result.total} {result.total === 1 ? 'product' : 'products'}</p>
      {result.items.length === 0 ? <p className="mt-12 text-ink/70">No products match. <Link href={base} className="text-brand-dark underline">Clear filters</Link></p> : (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((p, i) => (<Reveal as="li" key={p.id} delay={(i % 4) * 70}><ProductCard p={p} priority={i < 4} /></Reveal>))}
        </ul>
      )}
      <Pagination base={base} sp={{ ...sp, q: undefined }} page={result.page} pages={result.pages} />
    </div>
  );
}
