import Image from 'next/image';
import Link from 'next/link';
import { formatINR, discountPercent } from '@/lib/money';
import type { CardProduct } from '@/server/catalog';

export default function ProductCard({ p, priority = false }: { p: CardProduct; priority?: boolean }) {
  const src = p.image ?? '/images/placeholder.svg';
  const off = discountPercent(p.fromMrpPaise, p.fromPricePaise);
  return (
    <Link href={`/product/${p.slug}`} className="pcard group block overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/70 transition hover:-translate-y-1 hover:ring-brand">
      <div className="relative aspect-[4/3] overflow-hidden bg-bone">
        <Image src={src} alt={`${p.name}, ${p.category.name}`} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 45vw, 90vw" className="object-cover" priority={priority} unoptimized={src.endsWith('.svg')} />
        {off > 0 && <span className="absolute left-3 top-3 rounded-full bg-walnut px-2.5 py-1 text-[11px] font-semibold text-brand">{off}% off</span>}
        {!p.inStock && <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink">Out of stock</span>}
      </div>
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-widest text-brand-dark">{p.category.name}</p>
        <h3 className="mt-1 font-display text-xl font-semibold leading-snug">{p.name}</h3>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-semibold">{p.variantCount > 1 ? 'From ' : ''}{formatINR(p.fromPricePaise)}</span>
          {p.fromMrpPaise > p.fromPricePaise && <span className="text-sm text-ink/50 line-through">{formatINR(p.fromMrpPaise)}</span>}
        </p>
        <p className="mt-1 text-xs text-ink/60">Inclusive of GST</p>
      </div>
    </Link>
  );
}
