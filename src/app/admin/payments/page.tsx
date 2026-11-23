import Link from 'next/link';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { formatINR } from '@/lib/money';
import { STATUS_LABEL, type Status } from '@/lib/order-status';
import { DownloadLink } from '@/components/AdminUi';

// IST day boundaries for a yyyy-mm-dd date
const dayRange = (d: string) => ({ from: new Date(`${d}T00:00:00+05:30`), to: new Date(`${d}T23:59:59.999+05:30`) });
const todayIst = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

/** README §6 "Daily reconciliation report": what Razorpay / UPI says vs what our orders say, for one day. */
export default async function Payments({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAdmin();
  const { date } = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ? date! : todayIst();
  const { from, to } = dayRange(day);

  const [payments, paidOrders, awaitingUtr] = await Promise.all([
    prisma.payment.findMany({ where: { createdAt: { gte: from, lte: to } }, include: { order: { select: { id: true, publicId: true, status: true, totalPaise: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.order.findMany({ where: { paidAt: { gte: from, lte: to } }, include: { payments: true }, orderBy: { paidAt: 'asc' } }),
    prisma.order.findMany({ where: { paymentMethod: 'MANUAL_UPI', status: 'PENDING_PAYMENT', utrSubmittedAt: { not: null } }, orderBy: { utrSubmittedAt: 'asc' } }),
  ]);

  const captured = payments.filter((p) => p.status === 'captured');
  const capturedSum = captured.reduce((s, p) => s + p.amountPaise, 0);
  const paidSum = paidOrders.reduce((s, o) => s + o.totalPaise, 0);
  const issues = [
    ...payments.filter((p) => p.status === 'amount_mismatch').map((p) => ({ order: p.order, text: `Amount mismatch: payment ${formatINR(p.amountPaise)} vs order ${formatINR(p.order.totalPaise)} (${p.providerPaymentId}). Refund or contact the customer.` })),
    ...captured.filter((p) => !['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED'].includes(p.order.status)).map((p) => ({ order: p.order, text: `Captured payment but order is ${STATUS_LABEL[p.order.status as Status].toLowerCase()}.` })),
    ...paidOrders.filter((o) => !o.payments.some((p) => p.status === 'captured')).map((o) => ({ order: o, text: 'Order is paid but has no captured payment record.' })),
    ...paidOrders.filter((o) => o.notes?.includes('LATE PAYMENT')).map((o) => ({ order: o, text: 'Late payment: stock could not be re-reserved. Fulfil manually or refund.' })),
  ];
  const tile = (label: string, value: string) => <div className="rounded-2xl bg-white p-5 ring-1 ring-line/70"><p className="text-sm text-ink/60">{label}</p><p className="mt-1 font-display text-3xl font-semibold">{value}</p></div>;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold">Payments &amp; reconciliation</h1>
        <form className="flex items-end gap-2" action="/admin/payments"><div><label htmlFor="date" className="label">Day (IST)</label><input id="date" name="date" type="date" defaultValue={day} className="field !py-2" /></div><button className="btn btn-primary !py-2">Show</button></form>
      </div>

      {awaitingUtr.length > 0 && (
        <section className="mt-6 rounded-2xl bg-amber-50 p-5 text-sm ring-1 ring-amber-200">
          <h2 className="font-display text-xl font-semibold text-amber-950">Manual UPI payments to verify ({awaitingUtr.length})</h2>
          <p className="text-amber-900">Match each UTR and amount with your bank statement, then confirm on the order page.</p>
          <ul className="mt-2 space-y-1">{awaitingUtr.map((o) => <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="underline">{o.publicId.slice(0, 10)}</Link> · UTR <span className="font-mono">{o.upiUtr}</span> · {formatINR(o.totalPaise)} · sent {o.utrSubmittedAt?.toLocaleString('en-IN')}</li>)}</ul>
        </section>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {tile('Captured payments', `${captured.length} · ${formatINR(capturedSum)}`)}
        {tile('Orders marked paid', `${paidOrders.length} · ${formatINR(paidSum)}`)}
        {tile('Difference', formatINR(capturedSum - paidSum))}
      </div>
      <p className="mt-2 text-xs text-ink/60">Compare “Captured payments” with the Razorpay dashboard settlement report (or your bank statement for manual UPI) for the same day. A late webhook can put a payment on the day before or after its order.</p>

      <h2 className="mt-8 font-display text-2xl font-semibold">Needs attention ({issues.length})</h2>
      {issues.length === 0 ? <p className="mt-2 text-sm text-green-800">No mismatches for this day.</p> : <ul className="mt-2 space-y-2 text-sm">{issues.map((i, n) => <li key={n} className="rounded-lg bg-red-50 p-3 text-red-900"><Link href={`/admin/orders/${i.order.id}`} className="font-mono underline">{i.order.publicId.slice(0, 10)}</Link>: {i.text}</li>)}</ul>}

      <h2 className="mt-8 font-display text-2xl font-semibold">Payment events</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl bg-white ring-1 ring-line/70">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink/60"><tr><th className="px-4 py-3">Time</th><th>Provider</th><th>Payment ID</th><th>Status</th><th className="text-right">Amount</th><th className="px-4">Order</th></tr></thead>
          <tbody className="divide-y divide-line">
            {payments.map((p) => (<tr key={p.id}><td className="px-4 py-2">{p.createdAt.toLocaleTimeString('en-IN')}</td><td>{p.provider}</td><td className="font-mono text-xs">{p.providerPaymentId}</td><td>{p.status}</td><td className="text-right">{formatINR(p.amountPaise)}</td><td className="px-4"><Link href={`/admin/orders/${p.order.id}`} className="text-brand-dark underline">{p.order.publicId.slice(0, 10)}</Link></td></tr>))}
            {payments.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink/60">No payment events on this day.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-sm"><DownloadLink href={`/admin/export/orders?from=${day}&to=${day}`} className="text-brand-dark underline">Download this day&apos;s orders (CSV)</DownloadLink></p>
    </div>
  );
}
