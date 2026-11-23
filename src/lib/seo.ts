import { STORE } from '../config/store.ts';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const abs = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    name: STORE.name,
    legalName: STORE.legalName,
    url: SITE_URL,
    logo: abs('/brand/logo-full.png'),
    image: abs('/brand/logo-full.png'),
    telephone: STORE.phone,
    email: STORE.email,
    address: { '@type': 'PostalAddress', streetAddress: STORE.address, addressCountry: 'IN' },
    areaServed: { '@type': 'Country', name: 'India' },
    priceRange: '₹₹',
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function productJsonLd(p: {
  name: string;
  slug: string;
  description: string;
  images: string[];
  sku: string;
  material: string;
  lowPaise: number;
  highPaise: number;
  inStock: boolean;
  rating?: { average: number; count: number; reviews?: { author: string; rating: number; title: string; body: string; date: Date }[] };
}) {
  const url = abs(`/product/${p.slug}`);
  const offer = (price: number) => ({
    '@type': 'Offer',
    priceCurrency: 'INR',
    price: (price / 100).toFixed(2),
    availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url,
    seller: { '@type': 'Organization', name: STORE.name },
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.sku,
    material: p.material,
    brand: { '@type': 'Brand', name: STORE.name },
    image: p.images.map((i) => (i.startsWith('http') ? i : abs(i))),
    url,
    offers:
      p.lowPaise === p.highPaise
        ? offer(p.lowPaise)
        : {
            '@type': 'AggregateOffer',
            priceCurrency: 'INR',
            lowPrice: (p.lowPaise / 100).toFixed(2),
            highPrice: (p.highPaise / 100).toFixed(2),
            availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url,
          },
    // Only real, approved customer reviews are ever included (Google penalises self-serving or fake ratings).
    ...(p.rating && p.rating.count > 0
      ? {
          aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating.average.toFixed(1), reviewCount: p.rating.count, bestRating: 5, worstRating: 1 },
          review: (p.rating.reviews ?? []).slice(0, 5).map((r) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: r.author },
            reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
            name: r.title,
            reviewBody: r.body,
            datePublished: r.date.toISOString().slice(0, 10),
          })),
        }
      : {}),
  };
}

export function articleJsonLd(a: { title: string; slug: string; description: string; image?: string | null; published: Date; modified: Date }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    url: abs(`/blog/${a.slug}`),
    mainEntityOfPage: abs(`/blog/${a.slug}`),
    image: a.image ? [a.image.startsWith('http') ? a.image : abs(a.image)] : [abs('/og-default.png')],
    datePublished: a.published.toISOString(),
    dateModified: a.modified.toISOString(),
    author: { '@type': 'Organization', name: STORE.name, url: SITE_URL },
    publisher: { '@type': 'Organization', name: STORE.name, logo: { '@type': 'ImageObject', url: abs('/brand/logo-full.png') } },
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  };
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
