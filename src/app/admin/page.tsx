import Link from 'next/link';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { formatINR } from '@/lib/money';

export default async function Dashboard() {
  await requireAdmin();
  const since = new Date(Date.now() - 30 * 86400_000);
  const paidStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;
  const [agg, pending, toShip, low] = await Promise.all([
    prisma.order.aggregate({ where: { status: { in: [...paidStatuses] }, paidAt: { gte: since } }, _sum: { totalPaise: true }, _count: true }),
    prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
    prisma.order.count({ where: { status: { in: ['PAID', 'PROCESSING'] } } }),
    prisma.variant.findMany({ where: { stock: { lte: 2 }, product: { isActive: true } }, include: { product: { select: { name: true, id: true } } }, orderBy: { stock: 'asc' }, take: 10 }),
  ]);
  const stat = (label: string, value: string) => (<div className="rounded-2xl bg-white p-5 ring-1 ring-line/70"><p className="text-sm text-ink/60">{label}</p><p className="mt-1 font-display text-3xl font-semibold">{value}</p></div>);
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat('Paid orders (30 days)', String(agg._count))}
        {stat('Sales (30 days, incl. GST)', formatINR(agg._sum.totalPaise ?? 0))}
        {stat('To pack / ship', String(toShip))}
        {stat('Awaiting payment', String(pending))}
      </div>
      <h2 className="mt-10 font-display text-2xl font-semibold">Low stock</h2>
      {low.length === 0 ? <p className="mt-2 text-ink/60">Nothing low on stock.</p> : (
        <ul className="mt-3 divide-y divide-line rounded-2xl bg-white ring-1 ring-line/70">{low.map((v) => (<li key={v.id} className="flex justify-between px-5 py-3 text-sm"><Link href={`/admin/products/${v.product.id}`} className="hover:text-brand-dark">{v.product.name} ({v.label})</Link><span className="font-semibold">{v.stock} left</span></li>))}</ul>
      )}
    </div>
  );
}
