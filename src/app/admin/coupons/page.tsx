import Link from 'next/link';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { formatINR } from '@/lib/money';
import { evaluateCoupon } from '@/lib/coupon';
import { Flash } from '@/components/AdminUi';
import CouponForm from '@/components/CouponForm';
import { saveCouponAction } from '../manage-actions';

export default async function Coupons({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  await requireAdmin();
  const { error, saved } = await searchParams;
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  const now = new Date();
  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-4xl font-semibold">Coupons</h1>
      <Flash saved={saved} error={error} />
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white ring-1 ring-line/70">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink/60"><tr><th className="px-4 py-3">Code</th><th>Discount</th><th>Min order</th><th>Valid</th><th className="text-right">Used</th><th>Status</th><th className="px-4" /></tr></thead>
          <tbody className="divide-y divide-line">
            {coupons.map((c) => {
              const live = evaluateCoupon(c, Number.MAX_SAFE_INTEGER, now);
              const statusText = live.ok ? 'Live' : live.reason.replace('This coupon ', '').replace(/\.$/, '');
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-semibold">{c.code}<span className="block font-sans text-xs font-normal text-ink/60">{c.description}</span></td>
                  <td>{c.kind === 'PERCENT' ? `${c.value}%${c.maxDiscountPaise ? ` (max ${formatINR(c.maxDiscountPaise)})` : ''}` : formatINR(c.value)}</td>
                  <td>{c.minOrderPaise ? formatINR(c.minOrderPaise) : '—'}</td>
                  <td className="text-xs">{c.startsAt ? c.startsAt.toLocaleDateString('en-IN') : 'now'} → {c.endsAt ? c.endsAt.toLocaleDateString('en-IN') : 'no end'}</td>
                  <td className="text-right">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-xs ${live.ok ? 'bg-green-50 text-green-800' : 'bg-bone text-ink/70'}`}>{statusText}</span></td>
                  <td className="px-4 text-right"><Link href={`/admin/coupons/${c.id}`} className="text-brand-dark underline">Edit</Link></td>
                </tr>
              );
            })}
            {coupons.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-ink/60">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <h2 className="mt-10 font-display text-2xl font-semibold">Create a coupon</h2>
      <div className="mt-3"><CouponForm action={saveCouponAction.bind(null, null)} submit="Create coupon" /></div>
    </div>
  );
}
