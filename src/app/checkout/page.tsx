import type { Metadata } from 'next';
import CheckoutForm from '@/components/CheckoutForm';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <div className="container-x py-12">
      <h1 className="h-display text-4xl md:text-5xl">Checkout</h1>
      <CheckoutForm />
    </div>
  );
}
