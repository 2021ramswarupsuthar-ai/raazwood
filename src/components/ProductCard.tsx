import Image from 'next/image';
import Link from 'next/link';
import { formatINR, discountPercent } from '@/lib/money';
import type { CardProduct } from '@/server/catalog';

export default function ProductCard({ p, priority = false }: { p: CardProduct; priority?: boolean }) {
  const src = p.image ?? '/images/placeholder.svg';
  const off = discountPercent(p.fromMrpPaise, p.fromPricePaise);
  const saving = p.fromMrpPaise - p.fromPricePaise;
  return (
    <Link href={`/product/${p.slug}`} className="pcard group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/70 transition duration-300 hover:-translate-y-1 hover:shadow-lift hover:ring-brand">
      <div className="relative aspect-[4/3] overflow-hidden bg-bone">
        <Image src={src} alt={`${p.name}, ${p.category.name}`} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 45vw, 90vw" className="object-cover" priority={priority} unoptimized={src.endsWith('.svg')} />
        {p.image2 && <Image src={p.image2} alt="" fill sizes="(min-width:1024px) 25vw, 45vw" className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" unoptimized={p.image2.endsWith('.svg')} />}
        {off > 0 && <span className="absolute left-3 top-3 rounded-full bg-walnut px-2.5 py-1 text-[11px] font-semibold text-brand">{off}% off</span>}
        {!p.inStock && <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink">Out of stock</span>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-dark">{p.category.name}</p>
        <h3 className="mt-1 font-display text-xl font-semibold leading-snug">{p.name}</h3>
        <div className="mt-auto pt-3">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-semibold">{p.variantCount > 1 ? <span className="text-sm font-normal text-ink/60">From </span> : null}{formatINR(p.fromPricePaise)}</span>
            {p.fromMrpPaise > p.fromPricePaise && <span className="text-sm text-ink/50 line-through">{formatINR(p.fromMrpPaise)}</span>}
          </p>
          <p className="mt-0.5 text-xs text-ink/60">{saving > 0 ? <><span className="font-medium text-green-800">You save {formatINR(saving)}</span> · incl. GST</> : 'Inclusive of GST'}</p>
        </div>
      </div>
    </Link>
  );
}
