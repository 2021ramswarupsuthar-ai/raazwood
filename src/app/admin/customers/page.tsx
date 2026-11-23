import Link from 'next/link';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { formatINR } from '@/lib/money';
import { DownloadLink } from '@/components/AdminUi';

const PAID = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const term = q?.trim().slice(0, 60);
  const customers = await prisma.customer.findMany({
    where: term ? { OR: [{ phone: { contains: term.replace(/\D/g, '') || term } }, { name: { contains: term, mode: 'insensitive' } }, { email: { contains: term, mode: 'insensitive' } }] } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { _count: { select: { orders: true } } },
  });
  const spent = await prisma.order.groupBy({ by: ['customerId'], where: { customerId: { in: customers.map((c) => c.id) }, status: { in: [...PAID] } }, _sum: { totalPaise: true } });
  const spentBy = new Map(spent.map((s) => [s.customerId, s._sum.totalPaise ?? 0]));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold">Customers</h1>
        <DownloadLink href="/admin/export/customers">Export CSV</DownloadLink>
      </div>
      <p className="mt-1 text-sm text-ink/60">Customers with an account (OTP login). Guest orders are in Orders; they join an account automatically when that phone number logs in.</p>
      <form className="mt-4 flex gap-2" action="/admin/customers"><input name="q" defaultValue={term} placeholder="Search phone, name or email" className="field max-w-sm" /><button className="btn btn-primary">Search</button></form>
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white ring-1 ring-line/70">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink/60"><tr><th className="px-4 py-3">Customer</th><th>Phone</th><th>Email</th><th className="text-right">Orders</th><th className="text-right">Paid total</th><th>Joined</th><th className="px-4" /></tr></thead>
          <tbody className="divide-y divide-line">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name || <span className="text-ink/50">(no name)</span>}</td>
                <td>{c.phone}</td><td>{c.email ?? '—'}</td>
                <td className="text-right">{c._count.orders}</td>
                <td className="text-right">{formatINR(spentBy.get(c.id) ?? 0)}</td>
                <td>{c.createdAt.toLocaleDateString('en-IN')}</td>
                <td className="px-4 text-right"><Link href={`/admin/customers/${c.id}`} className="text-brand-dark underline">Open</Link></td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-ink/60">No customers{term ? ' match this search' : ' yet'}.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
