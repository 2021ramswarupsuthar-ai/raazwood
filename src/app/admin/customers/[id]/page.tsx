import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { formatINR } from '@/lib/money';
import { STATUS_LABEL, type Status } from '@/lib/order-status';
import { stateByCode } from '@/config/states';

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: { createdAt: 'desc' } },
      orders: { orderBy: { createdAt: 'desc' }, take: 100 },
      reviews: { orderBy: { createdAt: 'desc' }, include: { product: { select: { name: true } } } },
      _count: { select: { wishlist: true } },
    },
  });
  if (!c) notFound();
  return (
    <div className="max-w-4xl">
      <Link href="/admin/customers" className="text-sm text-brand-dark underline">← Customers</Link>
      <h1 className="mt-2 font-display text-4xl font-semibold">{c.name || 'Customer'}</h1>
      <p className="mt-1 text-sm text-ink/70">+91 {c.phone}{c.email ? ` · ${c.email}` : ''} · joined {c.createdAt.toLocaleDateString('en-IN')}{c.lastLoginAt ? ` · last login ${c.lastLoginAt.toLocaleString('en-IN')}` : ''} · {c._count.wishlist} wishlist item(s)</p>

      <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-line/70 text-sm">
        <h2 className="font-display text-xl font-semibold">Orders ({c.orders.length})</h2>
        {c.orders.length === 0 ? <p className="mt-2 text-ink/60">No orders.</p> : (
          <ul className="mt-2 divide-y divide-line">{c.orders.map((o) => (<li key={o.id} className="flex justify-between gap-3 py-2"><Link href={`/admin/orders/${o.id}`} className="text-brand-dark underline">{o.createdAt.toLocaleDateString('en-IN')} · {o.publicId.slice(0, 10)}</Link><span>{STATUS_LABEL[o.status as Status]} · {formatINR(o.totalPaise)}</span></li>))}</ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-line/70 text-sm">
        <h2 className="font-display text-xl font-semibold">Saved addresses</h2>
        {c.addresses.length === 0 ? <p className="mt-2 text-ink/60">None.</p> : <ul className="mt-2 space-y-2">{c.addresses.map((a) => <li key={a.id}>{a.name}, {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {stateByCode(a.stateCode)?.name} {a.pincode} · {a.phone}{a.isDefault ? ' (default)' : ''}</li>)}</ul>}
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-line/70 text-sm">
        <h2 className="font-display text-xl font-semibold">Reviews</h2>
        {c.reviews.length === 0 ? <p className="mt-2 text-ink/60">None.</p> : <ul className="mt-2 space-y-1">{c.reviews.map((r) => <li key={r.id}>{r.product.name}: {r.rating}★ “{r.title}” ({r.status.toLowerCase()})</li>)}</ul>}
      </section>
    </div>
  );
}
