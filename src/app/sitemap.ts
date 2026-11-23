import type { MetadataRoute } from 'next';
import { prisma } from '@/server/db';
import { abs } from '@/lib/seo';
import { CITIES } from '@/config/cities';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed = ['/', '/shop', '/faq', '/blog', '/about', '/contact', '/shipping-policy', '/returns-policy', '/privacy-policy', '/terms'].map((p) => ({ url: abs(p), lastModified: now, changeFrequency: 'weekly' as const, priority: p === '/' ? 1 : 0.6 }));
  const cities = CITIES.map((c) => ({ url: abs(`/furniture-in/${c.slug}`), lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 }));
  try {
    const [cats, prods, posts] = await Promise.all([
      prisma.category.findMany({ select: { slug: true } }),
      prisma.product.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
      prisma.blogPost.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    ]);
    return [
      ...fixed,
      ...cities,
      ...cats.map((c) => ({ url: abs(`/c/${c.slug}`), lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 })),
      ...prods.map((p) => ({ url: abs(`/product/${p.slug}`), lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.9 })),
      ...posts.map((p) => ({ url: abs(`/blog/${p.slug}`), lastModified: p.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ];
  } catch {
    return [...fixed, ...cities]; // database unavailable at build time: still serve a valid sitemap
  }
}
