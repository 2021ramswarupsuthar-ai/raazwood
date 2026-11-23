import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { prisma } from '@/server/db';
import { breadcrumbJsonLd } from '@/lib/seo';
import { readingMinutes } from '@/lib/richtext';

export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Buying Guides & Furniture Care Tips',
  description: 'Guides to choosing solid sheesham wood furniture: bed sizes, sheesham vs teak, dining sets, care and maintenance.',
  alternates: { canonical: '/blog' },
};

export default async function Blog() {
  const posts = await prisma.blogPost.findMany({ where: { isPublished: true }, orderBy: { publishedAt: 'desc' }, take: 60 }).catch(() => []);
  return (
    <div className="container-x py-12">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Guides', path: '/blog' }])} />
      <p className="eyebrow">Guides</p>
      <h1 className="h-display mt-2 text-4xl md:text-5xl">Buying guides &amp; care tips</h1>
      {posts.length === 0 ? <p className="mt-10 text-ink/70">New guides are coming soon.</p> : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => {
            const src = p.coverImage || '/images/placeholder.svg';
            return (
              <li key={p.id}>
                <Link href={`/blog/${p.slug}`} className="pcard group block overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/70 transition hover:-translate-y-1 hover:ring-brand">
                  <div className="relative aspect-[16/9] bg-bone"><Image src={src} alt="" fill sizes="(min-width:1024px) 33vw, 90vw" className="object-cover" unoptimized={src.endsWith('.svg')} /></div>
                  <div className="p-5">
                    <h2 className="font-display text-2xl font-semibold leading-snug">{p.title}</h2>
                    {p.excerpt && <p className="mt-2 text-sm text-ink/70">{p.excerpt}</p>}
                    <p className="mt-3 text-xs text-ink/60">{p.publishedAt?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {readingMinutes(p.body)} min read</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
