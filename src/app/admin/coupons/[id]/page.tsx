import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { Flash } from '@/components/AdminUi';
import CouponForm from '@/components/CouponForm';
import { saveCouponAction } from '../../manage-actions';

export default async function EditCoupon({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const c = await prisma.coupon.findUnique({ where: { id } });
  if (!c) notFound();
  const orders = await prisma.order.count({ where: { couponCode: c.code, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } });
  return (
    <div className="max-w-3xl">
      <Link href="/admin/coupons" className="text-sm text-brand-dark underline">← Coupons</Link>
      <h1 className="mt-2 font-display text-4xl font-semibold">Coupon {c.code}</h1>
      <p className="mt-1 text-sm text-ink/60">Used on {orders} paid order(s). To stop a coupon, untick Active (keeps the history).</p>
      <Flash error={error} />
      <div className="mt-6"><CouponForm action={saveCouponAction.bind(null, c.id)} c={c} submit="Save coupon" /></div>
    </div>
  );
}
