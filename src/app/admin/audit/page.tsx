import Link from 'next/link';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';

const LINK: Record<string, (id: string) => string> = {
  Order: (id) => `/admin/orders/${id}`,
  Product: (id) => `/admin/products/${id}`,
  Coupon: (id) => `/admin/coupons/${id}`,
  BlogPost: (id) => `/admin/blog/${id}`,
};

export default async function Audit({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  await requireAdmin();
  const { entity } = await searchParams;
  const logs = await prisma.auditLog.findMany({ where: entity ? { entity } : {}, orderBy: { createdAt: 'desc' }, take: 300 });
  const entities = ['Order', 'Product', 'Variant', 'Category', 'Coupon', 'Review', 'BlogPost', 'DeliveryZone'];
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-ink/60">Who changed prices, stock, orders, coupons and content, and when (latest 300).</p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/audit" className={`rounded-full border px-3 py-1 ${!entity ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white'}`}>All</Link>
        {entities.map((e) => <Link key={e} href={`/admin/audit?entity=${e}`} className={`rounded-full border px-3 py-1 ${entity === e ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white'}`}>{e}</Link>)}
      </nav>
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white ring-1 ring-line/70">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink/60"><tr><th className="px-4 py-3">When</th><th>Who</th><th>Action</th><th>Item</th><th className="px-4">Details</th></tr></thead>
          <tbody className="divide-y divide-line align-top">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-2">{l.createdAt.toLocaleString('en-IN')}</td>
                <td>{l.actor}</td>
                <td className="font-mono text-xs">{l.action}</td>
                <td>{l.entityId && LINK[l.entity] ? <Link href={LINK[l.entity](l.entityId)} className="text-brand-dark underline">{l.entity}</Link> : l.entity}</td>
                <td className="max-w-md break-all px-4 font-mono text-xs text-ink/70">{l.detail ? JSON.stringify(l.detail) : ''}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/60">No changes recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
