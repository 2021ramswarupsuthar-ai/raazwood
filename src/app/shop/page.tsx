import type { Metadata } from 'next';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import JsonLd from '@/components/JsonLd';
import { getCategories, listProducts } from '@/server/catalog';
import { breadcrumbJsonLd } from '@/lib/seo';

export const revalidate = 1800;

type SP = Promise<{ q?: string; sort?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: 'Shop Solid Sheesham Wood Furniture',
    description: 'Browse solid sheesham wood beds, sofas, dining sets, wardrobes and more. Delivered across India. Pay by UPI.',
    alternates: { canonical: '/shop' },
    robots: q ? { index: false, follow: true } : undefined, // never index internal search results
  };
}

export default async function Shop({ searchParams }: { searchParams: SP }) {
  const { q, sort } = await searchParams;
  const [cats, products] = await Promise.all([getCategories().catch(() => []), listProducts({ q: q?.slice(0, 60), sort }).catch(() => [])]);
  return (
    <div className="container-x py-12">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }])} />
      <p className="eyebrow">Shop</p>
      <h1 className="h-display mt-2 text-4xl md:text-5xl">{q ? `Results for “${q.slice(0, 60)}”` : 'Solid sheesham wood furniture'}</h1>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Categories" className="flex flex-wrap gap-2 text-sm">
          <Link href="/shop" className="rounded-full bg-brand-dark px-4 py-1.5 text-white">All</Link>
          {cats.map((c) => (<Link key={c.id} href={`/c/${c.slug}`} className="rounded-full border border-line bg-white px-4 py-1.5 hover:border-brand-dark">{c.name}</Link>))}
        </nav>
        <form className="flex items-center gap-2 text-sm" action="/shop">
          {q ? <input type="hidden" name="q" value={q} /> : null}
          <label htmlFor="sort" className="text-ink/70">Sort</label>
          <select id="sort" name="sort" defaultValue={sort ?? ''} className="field !w-auto !py-1.5">
            <option value="">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option>
          </select>
          <button className="btn btn-ghost !px-4 !py-1.5">Apply</button>
        </form>
      </div>

      {products.length === 0 ? (
        <p className="mt-16 text-center text-ink/70">No products found. <Link href="/shop" className="text-brand-dark underline">See all furniture</Link>.</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, i) => (<Reveal as="li" key={p.id} delay={(i % 4) * 70}><ProductCard p={p} priority={i < 4} /></Reveal>))}
        </ul>
      )}
    </div>
  );
}
