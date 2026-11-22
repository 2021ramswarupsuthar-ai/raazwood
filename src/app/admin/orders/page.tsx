import Link from 'next/link';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { formatINR } from '@/lib/money';
import { STATUS_LABEL, type Status } from '@/lib/order-status';

const FILTERS: (Status | 'ALL')[] = ['ALL', 'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'EXPIRED', 'REFUNDED'];

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const f = FILTERS.includes(status as Status) && status !== 'ALL' ? (status as Status) : undefined;
  const orders = await prisma.order.findMany({ where: f ? { status: f } : {}, orderBy: { createdAt: 'desc' }, take: 100 });
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">Orders</h1>
      <nav aria-label="Status filter" className="mt-4 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((s) => (<Link key={s} href={s === 'ALL' ? '/admin/orders' : `/admin/orders?status=${s}`} className={`rounded-full border px-3 py-1 ${(f ?? 'ALL') === s ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white'}`}>{s === 'ALL' ? 'All' : STATUS_LABEL[s]}</Link>))}
      </nav>
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white ring-1 ring-line/70">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink/60"><tr><th className="px-4 py-3">Date</th><th>Customer</th><th>State</th><th>Status</th><th className="text-right">Total</th><th className="px-4" /></tr></thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (<tr key={o.id}><td className="px-4 py-3">{o.createdAt.toLocaleString('en-IN')}</td><td>{o.customerName}<br /><span className="text-ink/60">{o.phone}</span></td><td>{o.stateCode}</td><td>{STATUS_LABEL[o.status as Status]}</td><td className="text-right font-medium">{formatINR(o.totalPaise)}</td><td className="px-4 text-right"><Link className="text-brand-dark underline" href={`/admin/orders/${o.id}`}>Open</Link></td></tr>))}
            {orders.length === 0 && <tr><td className="px-4 py-8 text-center text-ink/60" colSpan={6}>No orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
