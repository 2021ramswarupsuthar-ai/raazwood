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
