'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from './cart';
import { formatINR } from '@/lib/money';

export default function CartView() {
  const { lines, ready, setQty, remove } = useCart();
  if (!ready) return <p className="mt-10 text-ink/60">Loading your cart…</p>;
  if (lines.length === 0) {
    return (
      <div className="mt-10 rounded-2xl bg-white p-10 text-center ring-1 ring-line/70">
        <p className="font-display text-2xl">Your cart is empty</p>
        <p className="mt-2 text-ink/70">Browse our solid sheesham furniture and add something you love.</p>
        <Link href="/shop" className="btn btn-primary mt-6">Shop furniture</Link>
      </div>
    );
  }
  const subtotal = lines.reduce((s, l) => s + l.pricePaise * l.qty, 0);
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
      <ul className="space-y-4">
        {lines.map((l) => {
          const src = l.image ?? '/images/placeholder.svg';
          return (
            <li key={l.variantId} className="flex gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/70">
              <Link href={`/product/${l.slug}`} className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-bone">
                <Image src={src} alt={l.name} fill sizes="112px" className="object-cover" unoptimized={src.endsWith('.svg')} />
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link href={`/product/${l.slug}`} className="font-display text-xl font-semibold hover:text-brand-dark">{l.name}</Link>
                  <p className="text-sm text-ink/60">{l.label}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded-full border border-line">
                    <button type="button" className="h-9 w-9" onClick={() => setQty(l.variantId, l.qty - 1)} aria-label={`Decrease quantity of ${l.name}`}>−</button>
                    <span className="w-7 text-center text-sm font-semibold">{l.qty}</span>
                    <button type="button" className="h-9 w-9" onClick={() => setQty(l.variantId, l.qty + 1)} aria-label={`Increase quantity of ${l.name}`}>+</button>
                  </div>
                  <p className="font-semibold">{formatINR(l.pricePaise * l.qty)}</p>
                  <button type="button" onClick={() => remove(l.variantId)} className="text-sm text-ink/60 underline hover:text-red-700">Remove</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <aside className="h-fit rounded-2xl bg-white p-6 shadow-card ring-1 ring-line/70" aria-label="Order summary">
        <h2 className="font-display text-2xl font-semibold">Summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt>Items (incl. GST)</dt><dd className="font-semibold">{formatINR(subtotal)}</dd></div>
          <div className="flex justify-between text-ink/60"><dt>Delivery</dt><dd>Calculated at checkout</dd></div>
        </dl>
        <Link href="/checkout" className="btn btn-primary mt-6 w-full">Proceed to checkout</Link>
        <p className="mt-3 text-center text-xs text-ink/60">Secure UPI payment via Razorpay</p>
      </aside>
    </div>
  );
}
