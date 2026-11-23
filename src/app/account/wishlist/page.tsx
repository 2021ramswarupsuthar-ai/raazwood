import Link from 'next/link';
import { prisma } from '@/server/db';
import { requireCustomer } from '@/server/customer-auth';
import { toCard } from '@/server/catalog';
import ProductCard from '@/components/ProductCard';
import { removeFromWishlistAction } from '../actions';

export default async function Wishlist() {
  const c = await requireCustomer('/account/wishlist');
  const rows = await prisma.wishlistItem.findMany({
    where: { customerId: c.id, product: { isActive: true, deletedAt: null } },
    include: { product: { include: { category: true, variants: { orderBy: { pricePaise: 'asc' } } } } },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Wishlist</h1>
      {rows.length === 0 ? (
        <p className="mt-4 text-ink/70">Nothing saved yet. Tap the heart on any product to save it here. <Link href="/shop" className="text-brand-dark underline">Browse furniture</Link></p>
      ) : (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => (
            <li key={r.id}>
              <ProductCard p={toCard(r.product)} />
              <form action={removeFromWishlistAction.bind(null, r.productId)} className="mt-2 text-right"><button className="text-sm text-ink/60 underline hover:text-red-700">Remove</button></form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
