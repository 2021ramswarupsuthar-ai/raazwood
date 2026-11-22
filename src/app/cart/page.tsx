import type { Metadata } from 'next';
import CartView from '@/components/CartView';

export const metadata: Metadata = { title: 'Your cart', robots: { index: false, follow: false } };

export default function CartPage() {
  return (
    <div className="container-x py-12">
      <h1 className="h-display text-4xl md:text-5xl">Your cart</h1>
      <CartView />
    </div>
  );
}
