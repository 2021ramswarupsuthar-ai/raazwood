import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import { prisma } from '@/server/db';
import { abs, articleJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { parseBlocks, readingMinutes } from '@/lib/richtext';

export const revalidate = 1800;
type P = Promise<{ slug: string }>;

const getPost = (slug: string) => prisma.blogPost.findFirst({ where: { slug, isPublished: true } }).catch(() => null);

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) return { title: 'Article not found', robots: { index: false } };
  const description = (p.seoDesc || p.excerpt || p.body).slice(0, 160);
  return {
    title: p.seoTitle || p.title,
    description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: 'article', title: p.title, description, url: abs(`/blog/${p.slug}`), images: p.coverImage ? [{ url: p.coverImage }] : undefined, publishedTime: p.publishedAt?.toISOString() },
  };
}

export default async function Post({ params }: { params: P }) {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) notFound();
  const published = p.publishedAt ?? p.createdAt;
  return (
    <article className="container-x max-w-3xl py-12">
      <JsonLd data={articleJsonLd({ title: p.title, slug: p.slug, description: p.excerpt || p.title, image: p.coverImage, published, modified: p.updatedAt })} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Guides', path: '/blog' }, { name: p.title, path: `/blog/${p.slug}` }])} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink/60"><Link href="/" className="hover:text-brand-dark">Home</Link> / <Link href="/blog" className="hover:text-brand-dark">Guides</Link></nav>
      <h1 className="h-display mt-3 text-4xl md:text-5xl">{p.title}</h1>
      <p className="mt-3 text-sm text-ink/60">{published.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {readingMinutes(p.body)} min read</p>
      {p.coverImage && <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-bone"><Image src={p.coverImage} alt="" fill sizes="(min-width:768px) 768px, 100vw" className="object-cover" priority unoptimized={p.coverImage.endsWith('.svg')} /></div>}
      <div className="mt-8 space-y-4 text-[17px] leading-relaxed text-ink/85">
        {parseBlocks(p.body).map((b, i) =>
          b.type === 'h2' ? <h2 key={i} className="pt-4 font-display text-3xl font-semibold text-ink">{b.text}</h2>
          : b.type === 'h3' ? <h3 key={i} className="pt-2 font-display text-2xl font-semibold text-ink">{b.text}</h3>
          : b.type === 'ul' ? <ul key={i} className="list-disc space-y-1.5 pl-6">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
          : <p key={i}>{b.text}</p>,
        )}
      </div>
      <div className="mt-12 rounded-2xl bg-walnut p-6 text-bone">
        <p className="font-display text-2xl">Ready to choose your piece?</p>
        <p className="mt-1 text-sm text-bone/75">Browse solid sheesham furniture with delivery across India.</p>
        <Link href="/shop" className="btn btn-light mt-4">Shop furniture</Link>
      </div>
    </article>
  );
}
