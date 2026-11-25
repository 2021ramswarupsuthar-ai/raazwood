'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './cart';
import { formatINR, discountPercent } from '@/lib/money';

export type BuyVariant = { id: string; label: string; packQty: number; pricePaise: number; mrpPaise: number; stock: number };

export default function ProductBuy({ product, variants }: { product: { slug: string; name: string; image: string | null }; variants: BuyVariant[] }) {
  const first = variants.find((v) => v.stock > 0) ?? variants[0];
  const [vid, setVid] = useState(first?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const cart = useCart();
  const router = useRouter();
  const v = variants.find((x) => x.id === vid);
  if (!v) return <p>This product is currently unavailable.</p>;
  const off = discountPercent(v.mrpPaise, v.pricePaise);
  const saving = v.mrpPaise - v.pricePaise;
  const out = v.stock < 1;
  const max = Math.min(10, v.stock);

  const line = { variantId: v.id, name: product.name, label: v.label, pricePaise: v.pricePaise, image: product.image, slug: product.slug };
  const addNow = () => { cart.add(line, qty); setAdded(true); setTimeout(() => setAdded(false), 2200); };
  const buyNow = () => { cart.add(line, qty); router.push('/checkout'); };

  return (
    <div>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-line/70">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-4xl font-semibold">{formatINR(v.pricePaise)}</span>
          {v.mrpPaise > v.pricePaise && <span className="text-lg text-ink/50 line-through">{formatINR(v.mrpPaise)}</span>}
          {off > 0 && <span className="rounded-full bg-brand/20 px-2.5 py-1 text-sm font-semibold text-brand-dark">{off}% off</span>}
        </p>
        {saving > 0 && <p className="mt-1 text-sm font-medium text-green-800">You save {formatINR(saving)}</p>}
        <p className="mt-1 text-sm text-ink/60">Inclusive of GST. Delivery charge is shown at checkout.</p>

        {variants.length > 1 && (
          <fieldset className="mt-5">
            <legend className="label">Choose size / pack</legend>
            <div className="flex flex-wrap gap-2">
              {variants.map((x) => (
                <label key={x.id} className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm transition ${x.id === vid ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white hover:border-brand-dark'} ${x.stock < 1 ? 'opacity-50' : ''}`}>
                  <input type="radio" name="variant" value={x.id} checked={x.id === vid} onChange={() => { setVid(x.id); setQty(1); }} className="sr-only" />
                  {x.label}{x.packQty > 1 ? ` (pack of ${x.packQty})` : ''}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-full border border-line bg-white">
            <button type="button" className="h-11 w-11 text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span className="w-8 text-center font-semibold" aria-live="polite">{qty}</span>
            <button type="button" className="h-11 w-11 text-lg" onClick={() => setQty((q) => Math.min(max || 1, q + 1))} aria-label="Increase quantity">+</button>
          </div>
          <button type="button" className="btn btn-ghost" disabled={out} onClick={addNow}>{added ? 'Added ✓' : 'Add to cart'}</button>
          <button type="button" className="btn btn-primary" disabled={out} onClick={buyNow}>Buy now</button>
        </div>
        <p className="mt-3 text-sm" role="status">
          {out ? <span className="font-semibold text-red-700">Out of stock</span> : v.stock <= 3 ? <span className="font-semibold text-brand-dark">Only {v.stock} left</span> : <span className="text-green-800">In stock</span>}
        </p>
      </div>

      {/* Mobile bar: price and the two buy buttons stay in reach while scrolling. Right padding keeps the chat button free. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 py-2.5 pl-4 pr-20 shadow-[0_-6px_20px_rgba(43,33,24,.1)] backdrop-blur lg:hidden" role="region" aria-label="Quick buy">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-lg font-semibold">{formatINR(v.pricePaise)}</p>
            {off > 0 && <p className="truncate text-xs text-green-800">{off}% off · save {formatINR(saving)}</p>}
          </div>
          <button type="button" className="btn btn-ghost !px-4 !py-2.5" disabled={out} onClick={addNow}>{added ? 'Added ✓' : 'Add'}</button>
          <button type="button" className="btn btn-primary !px-4 !py-2.5" disabled={out} onClick={buyNow}>Buy now</button>
        </div>
      </div>
    </div>
  );
}
