import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Gallery from '@/components/Gallery';
import ProductBuy from '@/components/ProductBuy';
import PincodeChecker from '@/components/PincodeChecker';
import ProductCard from '@/components/ProductCard';
import JsonLd from '@/components/JsonLd';
import WishlistButton from '@/components/WishlistButton';
import ReviewForm from '@/components/ReviewForm';
import Stars from '@/components/Stars';
import UspStrip from '@/components/UspStrip';
import InfoAccordion from '@/components/InfoAccordion';
import { getApprovedReviews, getProductBySlug, getRelated } from '@/server/catalog';
import { abs, breadcrumbJsonLd, productJsonLd } from '@/lib/seo';
import { STORE } from '@/config/store';
import { PLATFORMS } from '@/lib/marketplaces';

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
  const [related, rv] = await Promise.all([getRelated(p.categoryId, p.id).catch(() => []), getApprovedReviews(p.id).catch(() => ({ reviews: [], count: 0, average: 0 }))]);
  const prices = p.variants.map((v) => v.pricePaise);
  const wa = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Hello Raazwood, I have a question about: ${p.name} (${abs('/product/' + p.slug)})`)}`;
  const specs: [string, string][] = [['Material', p.material], ['Finish', p.finish], ['Dimensions', p.dimensions]].filter(([, v]) => v) as [string, string][];

  return (
    <div className="container-x py-10 pb-28 lg:pb-10">
      <JsonLd
        data={productJsonLd({
          name: p.name, slug: p.slug, description: p.shortDesc || p.description, images: p.images.length ? p.images : ['/images/placeholder.svg'], sku: p.variants[0]?.sku ?? p.slug, material: p.material,
          lowPaise: Math.min(...prices), highPaise: Math.max(...prices), inStock: p.variants.some((v) => v.stock > 0),
          rating: { average: rv.average, count: rv.count, reviews: rv.reviews.map((r) => ({ author: r.authorName, rating: r.rating, title: r.title, body: r.body, date: r.createdAt })) },
        })}
      />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: p.category.name, path: `/c/${p.category.slug}` }, { name: p.name, path: `/product/${p.slug}` }])} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink/60"><Link href="/" className="hover:text-brand-dark">Home</Link> / <Link href={`/c/${p.category.slug}`} className="hover:text-brand-dark">{p.category.name}</Link> / {p.name}</nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <Gallery images={p.images} alt={p.name} />
        <div>
          <div className="flex items-start justify-between gap-4">
            <p className="eyebrow">{p.category.name}</p>
            <WishlistButton productId={p.id} />
          </div>
          <h1 className="h-display mt-2 text-4xl md:text-5xl">{p.name}</h1>
          {rv.count > 0 && <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm"><Stars value={rv.average} /> <span className="text-ink/70">{rv.average} ({rv.count} review{rv.count > 1 ? 's' : ''})</span></a>}
          {p.shortDesc && <p className="mt-3 text-lg text-ink/75">{p.shortDesc}</p>}
          <div className="mt-6"><ProductBuy product={{ slug: p.slug, name: p.name, image: p.images[0] ?? null }} variants={p.variants.map((v) => ({ id: v.id, label: v.label, packQty: v.packQty, pricePaise: v.pricePaise, mrpPaise: v.mrpPaise, stock: v.stock }))} /></div>
          <div className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-line/70"><PincodeChecker /></div>
          {p.marketplaces.length > 0 && (
            <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-line/70">
              <p className="text-sm font-medium">Also available on</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {PLATFORMS.filter((pl) => p.marketplaces.some((m) => m.platform === pl.key)).map((pl) => (
                  <li key={pl.key}><a href={p.marketplaces.find((m) => m.platform === pl.key)!.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-sm font-medium transition hover:border-brand-dark hover:text-brand-dark">{pl.label} <span aria-hidden="true">↗</span><span className="sr-only">(opens in a new tab)</span></a></li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4"><UspStrip compact /></div>
          <div className="mt-4"><InfoAccordion finish={p.finish} /></div>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-walnut px-5 py-4 text-bone transition hover:bg-walnut-soft"><span><span className="block font-display text-xl">Need a custom size or finish?</span><span className="block text-sm text-bone/70">Chat with our team about this product on WhatsApp</span></span><span aria-hidden="true" className="text-2xl text-brand">→</span></a>
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
          <p className="mt-4 text-sm text-ink/70">Questions about delivery, assembly or care? See our <Link href="/faq" className="text-brand-dark underline">FAQ</Link>.</p>
        </section>
      </div>

      <section id="reviews" className="mt-16 scroll-mt-24" aria-labelledby="rev">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="rev" className="font-display text-3xl font-semibold">Customer reviews</h2>
            {rv.count > 0 ? <p className="mt-1 flex items-center gap-2 text-sm"><Stars value={rv.average} size="text-lg" /> {rv.average} out of 5 · {rv.count} review{rv.count > 1 ? 's' : ''}</p> : <p className="mt-1 text-sm text-ink/60">No reviews yet. Bought this piece? Be the first to review it.</p>}
          </div>
        </div>
        {rv.count > 0 && (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {rv.reviews.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white p-5 ring-1 ring-line/70">
                <div className="flex items-center justify-between gap-3"><Stars value={r.rating} />{r.verified && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">Verified purchase</span>}</div>
                <p className="mt-2 font-semibold">{r.title}</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink/80">{r.body}</p>
                <p className="mt-3 text-xs text-ink/60">{r.authorName}{r.city ? `, ${r.city}` : ''} · {r.createdAt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 max-w-xl"><ReviewForm productId={p.id} /></div>
      </section>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="rel">
          <h2 id="rel" className="font-display text-3xl font-semibold">You may also like</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{related.map((r) => <li key={r.id}><ProductCard p={r} /></li>)}</ul>
        </section>
      )}
    </div>
  );
}
