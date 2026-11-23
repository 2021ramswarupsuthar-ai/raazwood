import Link from 'next/link';
import { prisma } from '@/server/db';
import { requireCustomer } from '@/server/customer-auth';
import OrderList from '@/components/OrderList';

export default async function AccountHome() {
  const c = await requireCustomer('/account');
  const [orders, addressCount, wishCount] = await Promise.all([
    prisma.order.findMany({ where: { customerId: c.id }, include: { items: { select: { productName: true, qty: true } } }, orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.address.count({ where: { customerId: c.id } }),
    prisma.wishlistItem.count({ where: { customerId: c.id } }),
  ]);
  const tile = (href: string, title: string, text: string) => (
    <Link href={href} className="rounded-2xl bg-white p-5 ring-1 ring-line/70 transition hover:ring-brand"><p className="font-display text-2xl font-semibold">{title}</p><p className="mt-1 text-sm text-ink/70">{text}</p></Link>
  );
  return (
    <div className="space-y-10">
      {!c.name && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Add your name in <Link href="/account/profile" className="underline">your profile</Link> for faster checkout.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {tile('/account/orders', 'Orders', 'Track orders and download invoices')}
        {tile('/account/addresses', `Addresses (${addressCount})`, 'Saved delivery addresses')}
        {tile('/account/wishlist', `Wishlist (${wishCount})`, 'Pieces you saved for later')}
      </div>
      <section>
        <div className="flex items-end justify-between"><h1 className="font-display text-3xl font-semibold">Recent orders</h1><Link href="/account/orders" className="text-sm text-brand-dark underline">All orders</Link></div>
        <div className="mt-4"><OrderList orders={orders} /></div>
      </section>
    </div>
  );
}
