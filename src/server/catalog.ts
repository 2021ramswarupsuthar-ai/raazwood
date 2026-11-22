import 'server-only';
import { prisma } from './db';

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  shortDesc: string;
  image: string | null;
  category: { slug: string; name: string };
  fromPricePaise: number;
  fromMrpPaise: number;
  inStock: boolean;
  variantCount: number;
};

type ProductWithRel = Awaited<ReturnType<typeof loadProducts>>[number];

async function loadProducts(where: Record<string, unknown> = {}) {
  return prisma.product.findMany({
    where: { isActive: true, ...where },
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

export async function listProducts(opts: { categorySlug?: string; q?: string; sort?: string; featured?: boolean; take?: number } = {}) {
  const where: Record<string, unknown> = {};
  if (opts.categorySlug) where.category = { slug: opts.categorySlug };
  if (opts.featured) where.isFeatured = true;
  if (opts.q) {
    where.OR = [
      { name: { contains: opts.q, mode: 'insensitive' } },
      { shortDesc: { contains: opts.q, mode: 'insensitive' } },
      { category: { name: { contains: opts.q, mode: 'insensitive' } } },
    ];
  }
  let cards = (await loadProducts(where)).map(toCard);
  if (opts.sort === 'price-asc') cards.sort((a, b) => a.fromPricePaise - b.fromPricePaise);
  if (opts.sort === 'price-desc') cards.sort((a, b) => b.fromPricePaise - a.fromPricePaise);
  if (opts.take) cards = cards.slice(0, opts.take);
  return cards;
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    include: { category: true, variants: { orderBy: { pricePaise: 'asc' } } },
  });
}

export async function getRelated(categoryId: string, excludeId: string) {
  const items = await loadProducts({ categoryId, NOT: { id: excludeId } });
  return items.slice(0, 4).map(toCard);
}
