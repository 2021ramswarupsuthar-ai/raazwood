import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Gallery from '@/components/Gallery';
import ProductBuy from '@/components/ProductBuy';
import PincodeChecker from '@/components/PincodeChecker';
import ProductCard from '@/components/ProductCard';
import JsonLd from '@/components/JsonLd';
import { getProductBySlug, getRelated } from '@/server/catalog';
import { abs, breadcrumbJsonLd, productJsonLd } from '@/lib/seo';
import { STORE } from '@/config/store';

export const revalidate = 1800;
type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug).catch(() => null);
  if (!p) return { title: 'Product not found', robots: { index: false } };
  const title = p.seoTitle ?? `${p.name} | Solid Sheesham Wood ${p.category.name}`;
  const description = (p.seoDesc ?? (p.shortDesc || p.description)).slice(0, 160);
  const img = p.images[0];
  return {
    title: { absolute: title.includes('Raazwood') ? title : `${title} | Raazwood` },
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { type: 'website', title, description, url: abs(`/product/${p.slug}`), images: img ? [{ url: img }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: P }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug).catch(() => null);
  if (!p) notFound();
  const related = await getRelated(p.categoryId, p.id).catch(() => []);
  const prices = p.variants.map((v) => v.pricePaise);
  const wa = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Hello Raazwood, I have a question about: ${p.name} (${abs('/product/' + p.slug)})`)}`;
  const specs: [string, string][] = [['Material', p.material], ['Finish', p.finish], ['Dimensions', p.dimensions]].filter(([, v]) => v) as [string, string][];

  return (
    <div className="container-x py-10">
      <JsonLd data={productJsonLd({ name: p.name, slug: p.slug, description: p.shortDesc || p.description, images: p.images.length ? p.images : ['/images/placeholder.svg'], sku: p.variants[0]?.sku ?? p.slug, material: p.material, lowPaise: Math.min(...prices), highPaise: Math.max(...prices), inStock: p.variants.some((v) => v.stock > 0) })} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: p.category.name, path: `/c/${p.category.slug}` }, { name: p.name, path: `/product/${p.slug}` }])} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink/60"><Link href="/" className="hover:text-brand-dark">Home</Link> / <Link href={`/c/${p.category.slug}`} className="hover:text-brand-dark">{p.category.name}</Link> / {p.name}</nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <Gallery images={p.images} alt={p.name} />
        <div>
          <p className="eyebrow">{p.category.name}</p>
          <h1 className="h-display mt-2 text-4xl md:text-5xl">{p.name}</h1>
          {p.shortDesc && <p className="mt-3 text-lg text-ink/75">{p.shortDesc}</p>}
          <div className="mt-6"><ProductBuy product={{ slug: p.slug, name: p.name, image: p.images[0] ?? null }} variants={p.variants.map((v) => ({ id: v.id, label: v.label, packQty: v.packQty, pricePaise: v.pricePaise, mrpPaise: v.mrpPaise, stock: v.stock }))} /></div>
          <div className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-line/70"><PincodeChecker /></div>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-sm font-semibold text-brand-dark underline-offset-4 hover:underline">Ask about this product on WhatsApp →</a>
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="desc">
          <h2 id="desc" className="font-display text-3xl font-semibold">About this piece</h2>
          <div className="mt-3 space-y-3 leading-relaxed text-ink/80">{(p.description || p.shortDesc).split('\n').filter(Boolean).map((t, i) => <p key={i}>{t}</p>)}</div>
          {p.features.length > 0 && <ul className="mt-5 list-disc space-y-1.5 pl-5 text-ink/80">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>}
        </section>
        <section aria-labelledby="spec">
          <h2 id="spec" className="font-display text-3xl font-semibold">Specifications</h2>
          <dl className="mt-3 divide-y divide-line rounded-2xl bg-white ring-1 ring-line/70">
            {specs.map(([k, v]) => (<div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm"><dt className="text-ink/60">{k}</dt><dd className="text-right font-medium">{v}</dd></div>))}
            <div className="flex justify-between gap-4 px-5 py-3 text-sm"><dt className="text-ink/60">Price includes</dt><dd className="text-right font-medium">GST</dd></div>
          </dl>
        </section>
      </div>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="rel">
          <h2 id="rel" className="font-display text-3xl font-semibold">You may also like</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{related.map((r) => <li key={r.id}><ProductCard p={r} /></li>)}</ul>
        </section>
      )}
    </div>
  );
}
