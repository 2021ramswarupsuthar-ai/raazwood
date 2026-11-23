import Link from 'next/link';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import Stars from '@/components/Stars';
import { moderateReviewAction } from '../manage-actions';

const TABS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const tab = (TABS as readonly string[]).includes(status ?? '') ? (status as (typeof TABS)[number]) : 'PENDING';
  const [reviews, counts] = await Promise.all([
    prisma.review.findMany({ where: { status: tab }, orderBy: { createdAt: 'desc' }, take: 100, include: { product: { select: { name: true, slug: true } }, customer: { select: { id: true, phone: true } } } }),
    prisma.review.groupBy({ by: ['status'], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-4xl font-semibold">Reviews</h1>
      <p className="mt-1 text-sm text-ink/60">Approve genuine reviews only. Approved reviews appear on the product page and in Google rich results.</p>
      <nav className="mt-4 flex gap-2 text-sm">{TABS.map((t) => <Link key={t} href={`/admin/reviews?status=${t}`} className={`rounded-full border px-3 py-1 ${tab === t ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white'}`}>{t[0] + t.slice(1).toLowerCase()} ({count(t)})</Link>)}</nav>
      {reviews.length === 0 ? <p className="mt-8 text-ink/60">Nothing here.</p> : (
        <ul className="mt-6 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl bg-white p-5 text-sm ring-1 ring-line/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/product/${r.product.slug}`} className="font-semibold text-brand-dark underline" target="_blank">{r.product.name}</Link>
                <span className="flex items-center gap-2"><Stars value={r.rating} />{r.verified ? <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-800">Verified purchase</span> : <span className="rounded-full bg-bone px-2 py-0.5 text-xs text-ink/70">Not verified</span>}</span>
              </div>
              <p className="mt-2 font-semibold">{r.title}</p>
              <p className="mt-1 whitespace-pre-line text-ink/80">{r.body}</p>
              <p className="mt-2 text-xs text-ink/60">{r.authorName}{r.city ? `, ${r.city}` : ''} · <Link href={`/admin/customers/${r.customer.id}`} className="underline">{r.customer.phone}</Link> · {r.createdAt.toLocaleString('en-IN')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== 'APPROVED' && <form action={moderateReviewAction.bind(null, r.id, 'APPROVED')}><button className="btn btn-primary !px-4 !py-1.5">Approve</button></form>}
                {r.status !== 'REJECTED' && <form action={moderateReviewAction.bind(null, r.id, 'REJECTED')}><button className="btn btn-ghost !px-4 !py-1.5">Reject</button></form>}
                <form action={moderateReviewAction.bind(null, r.id, 'DELETE')}><button className="px-2 py-1.5 text-red-700 underline">Delete</button></form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
