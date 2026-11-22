'use client';
import Link from 'next/link';
import { useCart } from './cart';

export default function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="relative inline-flex h-10 items-center gap-2 rounded-full border border-brand-dark/40 px-4 text-sm font-semibold text-brand-dark transition hover:bg-brand-dark hover:text-white" aria-label={`Cart, ${ready ? count : 0} items`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 7h12l-1 12H7L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
      <span>Cart</span>
      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-dark px-1 text-[11px] text-white" aria-hidden="true">{ready ? count : 0}</span>
    </Link>
  );
}
