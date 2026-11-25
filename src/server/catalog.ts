import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from './db';

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  shortDesc: string;
  image: string | null;
  image2: string | null;
  category: { slug: string; name: string };
  fromPricePaise: number;
  fromMrpPaise: number;
  inStock: boolean;
  variantCount: number;
};

type ProductWithRel = Awaited<ReturnType<typeof loadProducts>>[number];

// Visible on the storefront = active and not archived.
const VISIBLE = { isActive: true, deletedAt: null } as const;

async function loadProducts(where: Prisma.ProductWhereInput = {}) {
  return prisma.product.findMany({
    where: { ...VISIBLE, ...where },
    include: { category: true, variants: { orderBy: { pricePaise: 'asc' } } },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  });
}

export function toCard(p: ProductWithRel): CardProduct {
  const cheapest = p.variants[0];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDesc: p.shortDesc,
    image: p.images[0] ?? null,
    image2: p.images[1] ?? null,
    category: { slug: p.category.slug, name: p.category.name },
    fromPricePaise: cheapest?.pricePaise ?? 0,
    fromMrpPaise: cheapest?.mrpPaise ?? 0,
    inStock: p.variants.some((v) => v.stock > 0),
    variantCount: p.variants.length,
  };
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
}

export async function getCategory(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

export type ListOpts = {
  categorySlug?: string;
  q?: string;
  sort?: string;
  featured?: boolean;
  take?: number;
  minPaise?: number;
  maxPaise?: number;
  inStock?: boolean;
};

function whereFor(opts: ListOpts): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (opts.categorySlug) where.category = { slug: opts.categorySlug };
  if (opts.featured) where.isFeatured = true;
  if (opts.q) {
    where.OR = [
      { name: { contains: opts.q, mode: 'insensitive' } },
      { shortDesc: { contains: opts.q, mode: 'insensitive' } },
      { material: { contains: opts.q, mode: 'insensitive' } },
      { finish: { contains: opts.q, mode: 'insensitive' } },
      { category: { name: { contains: opts.q, mode: 'insensitive' } } },
    ];
  }
  return where;
}

/** ~100 listings at launch (README §1A), so filtering and sorting in memory is simple and fast enough. */
export async function listProducts(opts: ListOpts = {}) {
  let cards = (await loadProducts(whereFor(opts))).map(toCard);
  if (opts.minPaise !== undefined) cards = cards.filter((c) => c.fromPricePaise >= opts.minPaise!);
  if (opts.maxPaise !== undefined) cards = cards.filter((c) => c.fromPricePaise <= opts.maxPaise!);
  if (opts.inStock) cards = cards.filter((c) => c.inStock);
  if (opts.sort === 'price-asc') cards.sort((a, b) => a.fromPricePaise - b.fromPricePaise);
  if (opts.sort === 'price-desc') cards.sort((a, b) => b.fromPricePaise - a.fromPricePaise);
  if (opts.sort === 'discount') cards.sort((a, b) => (b.fromMrpPaise - b.fromPricePaise) / (b.fromMrpPaise || 1) - (a.fromMrpPaise - a.fromPricePaise) / (a.fromMrpPaise || 1));
  if (opts.take) cards = cards.slice(0, opts.take);
  return cards;
}

export const PAGE_SIZE = 12;

export async function listProductsPage(opts: ListOpts & { page?: number }) {
  const all = await listProducts({ ...opts, take: undefined });
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(opts.page ?? 1)), pages);
  return { items: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: all.length, page, pages };
}

/** Header search box suggestions. */
export async function suggestProducts(q: string, take = 6) {
  const rows = await prisma.product.findMany({
    where: { ...VISIBLE, ...whereFor({ q }) },
    select: { slug: true, name: true, images: true, category: { select: { name: true } }, variants: { select: { pricePaise: true }, orderBy: { pricePaise: 'asc' }, take: 1 } },
    orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
    take,
  });
  return rows.map((r) => ({ slug: r.slug, name: r.name, category: r.category.name, image: r.images[0] ?? null, fromPricePaise: r.variants[0]?.pricePaise ?? 0 }));
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, ...VISIBLE },
    include: { category: true, variants: { orderBy: { pricePaise: 'asc' } }, marketplaces: true },
  });
}

export async function getRelated(categoryId: string, excludeId: string) {
  const items = await loadProducts({ categoryId, NOT: { id: excludeId } });
  return items.slice(0, 4).map(toCard);
}

export async function getApprovedReviews(productId: string) {
  const reviews = await prisma.review.findMany({
    where: { productId, status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, rating: true, title: true, body: true, authorName: true, city: true, verified: true, createdAt: true },
    take: 50,
  });
  const count = reviews.length;
  const average = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  return { reviews, count, average };
}
