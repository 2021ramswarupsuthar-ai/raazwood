import type { Metadata } from 'next';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import JsonLd from '@/components/JsonLd';
import ShopFilters, { Pagination, isFiltered, parseListParams, type ListParams } from '@/components/ShopFilters';
import { getCategories, listProductsPage } from '@/server/catalog';
import { breadcrumbJsonLd } from '@/lib/seo';

export const revalidate = 1800;

type SP = Promise<ListParams>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: 'Shop Solid Sheesham Wood Furniture',
    description: 'Browse solid sheesham wood beds, sofas, dining sets, wardrobes and more. Delivered across India. Pay by UPI.',
    alternates: { canonical: '/shop' },
    // search results and filtered/sorted variations are not indexed (canonical points to /shop)
    robots: isFiltered(sp) ? { index: false, follow: true } : undefined,
  };
}

export default async function Shop({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const opts = parseListParams(sp);
  const [cats, result] = await Promise.all([getCategories().catch(() => []), listProductsPage(opts).catch(() => ({ items: [], total: 0, page: 1, pages: 1 }))]);
  return (
    <div className="container-x py-12">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }])} />
      <p className="eyebrow">Shop</p>
      <h1 className="h-display mt-2 text-4xl md:text-5xl">{opts.q ? `Results for “${opts.q}”` : 'Solid sheesham wood furniture'}</h1>

      <nav aria-label="Categories" className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href="/shop" className="rounded-full bg-brand-dark px-4 py-1.5 text-white">All</Link>
        {cats.map((c) => (<Link key={c.id} href={`/c/${c.slug}`} className="rounded-full border border-line bg-white px-4 py-1.5 hover:border-brand-dark">{c.name}</Link>))}
      </nav>
      <div className="mt-4"><ShopFilters action="/shop" sp={sp} /></div>
      <p className="mt-4 text-sm text-ink/60" role="status">{result.total} {result.total === 1 ? 'product' : 'products'}</p>

      {result.items.length === 0 ? (
        <p className="mt-16 text-center text-ink/70">No products found. <Link href="/shop" className="text-brand-dark underline">See all furniture</Link>.</p>
      ) : (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((p, i) => (<Reveal as="li" key={p.id} delay={(i % 4) * 70}><ProductCard p={p} priority={i < 4} /></Reveal>))}
        </ul>
      )}
      <Pagination base="/shop" sp={sp} page={result.page} pages={result.pages} />
    </div>
  );
}
