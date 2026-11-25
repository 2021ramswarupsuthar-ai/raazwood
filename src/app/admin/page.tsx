import Link from 'next/link';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { formatINR } from '@/lib/money';
import StatusBadge from '@/components/StatusBadge';
import SalesChart, { type Day } from '@/components/SalesChart';
import { Icon } from '@/components/AdminNav';

const PAID = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;
const IST = 5.5 * 3_600_000;
const istKey = (d: Date) => new Date(d.getTime() + IST).toISOString().slice(0, 10);

export default async function Dashboard() {
  const admin = await requireAdmin();
  const now = Date.now();
  const since30 = new Date(now - 30 * 86_400_000);
  const since60 = new Date(now - 60 * 86_400_000);
  const since14 = new Date(now - 14 * 86_400_000);

  const [cur, prev, pending, toShip, utr, reviews, recent, low, paid14, top] = await Promise.all([
    prisma.order.aggregate({ where: { status: { in: [...PAID] }, paidAt: { gte: since30 } }, _sum: { totalPaise: true }, _count: true }),
    prisma.order.aggregate({ where: { status: { in: [...PAID] }, paidAt: { gte: since60, lt: since30 } }, _sum: { totalPaise: true }, _count: true }),
    prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
    prisma.order.count({ where: { status: { in: ['PAID', 'PROCESSING'] } } }),
    prisma.order.count({ where: { paymentMethod: 'MANUAL_UPI', status: 'PENDING_PAYMENT', utrSubmittedAt: { not: null } } }),
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.variant.findMany({ where: { stock: { lte: 2 }, product: { isActive: true, deletedAt: null } }, include: { product: { select: { name: true, id: true } } }, orderBy: { stock: 'asc' }, take: 6 }),
    prisma.order.findMany({ where: { status: { in: [...PAID] }, paidAt: { gte: since14 } }, select: { paidAt: true, totalPaise: true } }),
    prisma.orderItem.groupBy({ by: ['productName'], where: { order: { status: { in: [...PAID] }, paidAt: { gte: since30 } } }, _sum: { qty: true, lineTotalPaise: true }, orderBy: { _sum: { lineTotalPaise: 'desc' } }, take: 5 }),
  ]);

  // last 14 days, IST, oldest first
  const days: Day[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * 86_400_000);
    return { label: new Date(d.getTime() + IST).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }), paise: 0, orders: 0, key: istKey(d) } as Day & { key: string };
  });
  const byKey = new Map((days as (Day & { key: string })[]).map((d) => [d.key, d]));
  for (const o of paid14) { const d = o.paidAt && byKey.get(istKey(o.paidAt)); if (d) { d.paise += o.totalPaise; d.orders += 1; } }

  const sales = cur._sum.totalPaise ?? 0;
  const salesPrev = prev._sum.totalPaise ?? 0;
  const delta = (a: number, b: number) => (b === 0 ? null : Math.round(((a - b) / b) * 100));
  const salesDelta = delta(sales, salesPrev);
  const ordersDelta = delta(cur._count, prev._count);
  const aov = cur._count ? Math.round(sales / cur._count) : 0;

  const Delta = ({ v }: { v: number | null }) => v === null ? <span className="text-xs text-ink/40">no earlier data</span> : <span className={`text-xs font-semibold ${v >= 0 ? 'text-green-700' : 'text-rose-700'}`}>{v >= 0 ? '▲' : '▼'} {Math.abs(v)}% <span className="font-normal text-ink/50">vs previous 30 days</span></span>;
  const Stat = ({ label, value, sub, icon }: { label: string; value: string; sub: React.ReactNode; icon: string }) => (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/70">
      <div className="flex items-center justify-between"><p className="text-sm text-ink/60">{label}</p><span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/15 text-brand-dark"><Icon name={icon} /></span></div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 min-h-4">{sub}</div>
    </div>
  );

  const todo = [
    utr > 0 && { href: '/admin/orders?utr=1', text: `${utr} UPI payment${utr > 1 ? 's' : ''} to verify`, tone: 'amber' },
    toShip > 0 && { href: '/admin/orders?status=PAID', text: `${toShip} order${toShip > 1 ? 's' : ''} to pack or ship`, tone: 'sky' },
    reviews > 0 && { href: '/admin/reviews', text: `${reviews} review${reviews > 1 ? 's' : ''} waiting for approval`, tone: 'stone' },
    low.length > 0 && { href: '/admin/products', text: `${low.length} variant${low.length > 1 ? 's' : ''} low on stock`, tone: 'rose' },
  ].filter(Boolean) as { href: string; text: string; tone: string }[];
  const TONE: Record<string, string> = { amber: 'bg-amber-50 text-amber-900 ring-amber-200', sky: 'bg-sky-50 text-sky-900 ring-sky-200', stone: 'bg-white text-ink ring-line', rose: 'bg-rose-50 text-rose-900 ring-rose-200' };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display">Dashboard</h1><p className="mt-0.5 text-sm text-ink/60">Welcome back, {admin.email}. Figures are for the last 30 days.</p></div>
        <div className="flex gap-2"><Link href="/admin/products/new" className="btn btn-primary">Add product</Link><Link href="/admin/orders" className="btn btn-ghost">All orders</Link></div>
      </div>

      {todo.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Needs your attention">
          {todo.map((t) => <li key={t.text}><Link href={t.href} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset hover:shadow-card ${TONE[t.tone]}`}>{t.text} <span aria-hidden="true">→</span></Link></li>)}
        </ul>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Sales (incl. GST)" value={formatINR(sales)} sub={<Delta v={salesDelta} />} icon="pay" />
        <Stat label="Paid orders" value={String(cur._count)} sub={<Delta v={ordersDelta} />} icon="orders" />
        <Stat label="Average order value" value={formatINR(aov)} sub={<span className="text-xs text-ink/50">per paid order</span>} icon="tag" />
        <Stat label="Awaiting payment" value={String(pending)} sub={<Link href="/admin/orders?status=PENDING_PAYMENT" className="text-xs text-brand-dark underline">View orders</Link>} icon="truck" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/70" aria-labelledby="sales-h">
          <div className="flex items-center justify-between"><h2 id="sales-h">Sales, last 14 days</h2><span className="text-sm text-ink/60">{formatINR(days.reduce((s, d) => s + d.paise, 0))}</span></div>
          <div className="mt-3"><SalesChart days={days} /></div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/70" aria-labelledby="top-h">
          <h2 id="top-h">Top products</h2>
          {top.length === 0 ? <p className="mt-3 text-sm text-ink/60">No paid orders yet.</p> : (
            <ol className="mt-3 space-y-3">{top.map((t, i) => (
              <li key={t.productName} className="flex items-center gap-3 text-sm"><span className="grid h-6 w-6 place-items-center rounded-full bg-bone text-xs font-semibold">{i + 1}</span><span className="min-w-0 flex-1 truncate">{t.productName}</span><span className="text-right"><span className="block font-semibold">{formatINR(t._sum.lineTotalPaise ?? 0)}</span><span className="block text-xs text-ink/50">{t._sum.qty} sold</span></span></li>
            ))}</ol>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/70" aria-labelledby="rec-h">
          <div className="flex items-center justify-between px-5 pt-5"><h2 id="rec-h">Recent orders</h2><Link href="/admin/orders" className="text-sm text-brand-dark underline">View all</Link></div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-ink/60"><tr><th className="px-5">Order</th><th>Customer</th><th>Status</th><th className="px-5 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-line">
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className="px-5 py-3"><Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-brand-dark underline">{o.publicId.slice(0, 10)}</Link><span className="block text-xs text-ink/50">{o.createdAt.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span></td>
                    <td>{o.customerName}<span className="block text-xs text-ink/50">{o.city}, {o.stateCode}</span></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="px-5 text-right font-medium">{formatINR(o.totalPaise)}</td>
                  </tr>
                ))}
                {recent.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-ink/60">No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/70" aria-labelledby="low-h">
          <h2 id="low-h">Low stock</h2>
          {low.length === 0 ? <p className="mt-3 text-sm text-ink/60">Nothing low on stock.</p> : (
            <ul className="mt-3 divide-y divide-line text-sm">{low.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2.5"><Link href={`/admin/products/${v.product.id}`} className="min-w-0 truncate hover:text-brand-dark">{v.product.name} <span className="text-ink/50">({v.label})</span></Link><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.stock === 0 ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800'}`}>{v.stock === 0 ? 'Out' : `${v.stock} left`}</span></li>
            ))}</ul>
          )}
        </section>
      </div>
    </div>
  );
}
