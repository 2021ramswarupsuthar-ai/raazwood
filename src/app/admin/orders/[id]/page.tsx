import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/server/admin-auth';
import { prisma } from '@/server/db';
import { formatINR } from '@/lib/money';
import { STATUS_LABEL, allowedNext, type Status } from '@/lib/order-status';
import { Flash } from '@/components/AdminUi';
import StatusBadge from '@/components/StatusBadge';
import { updateOrderStatusAction } from '../../actions';
import { confirmUtrAction, rejectUtrAction } from '../../manage-actions';

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const o = await prisma.order.findUnique({ where: { id }, include: { items: true, payments: true, customer: { select: { id: true, name: true } } } });
  if (!o) notFound();
  const next = allowedNext(o.status as Status);
  const manual = o.paymentMethod === 'MANUAL_UPI';
  const awaitingUtr = manual && o.upiUtr && (o.status === 'PENDING_PAYMENT' || o.status === 'EXPIRED');
  return (
    <div className="max-w-4xl">
      <Link href="/admin/orders" className="text-sm text-brand-dark underline">← All orders</Link>
      <h1 className="mt-2 font-display text-4xl font-semibold">Order {o.publicId}</h1>
      <p className="mt-1 text-ink/70"><StatusBadge status={o.status} /> · {manual ? 'Manual UPI' : 'Razorpay'}{o.invoiceNo ? ` · Invoice ${o.invoiceNo}` : ''} · placed {o.createdAt.toLocaleString('en-IN')}</p>
      <Flash error={error} />
      {o.notes && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Notes: {o.notes}</p>}

      {manual && (o.status === 'PENDING_PAYMENT' || o.status === 'EXPIRED') && (
        <section className="mt-4 rounded-2xl bg-amber-50 p-5 text-sm ring-1 ring-amber-200">
          <h2 className="font-display text-xl font-semibold text-amber-950">Manual UPI payment</h2>
          {awaitingUtr ? (
            <>
              <p className="mt-1 text-amber-900">Customer sent UTR <strong className="font-mono">{o.upiUtr}</strong> on {o.utrSubmittedAt?.toLocaleString('en-IN')}. Check your bank statement for <strong>{formatINR(o.totalPaise)}</strong> with this reference before confirming.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <form action={confirmUtrAction.bind(null, o.id)}><button className="btn btn-primary">Payment received: mark paid</button></form>
                <form action={rejectUtrAction.bind(null, o.id)}><button className="btn btn-ghost">Not found: ask customer to re-check</button></form>
              </div>
            </>
          ) : <p className="mt-1 text-amber-900">Waiting for the customer to pay and send the UTR. The order expires {o.expiresAt.toLocaleString('en-IN')} if no UTR arrives.</p>}
        </section>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line/70 text-sm">
          <h2 className="font-display text-xl font-semibold">Customer</h2>
          <p className="mt-2">{o.customerName}{o.customer && <> · <Link href={`/admin/customers/${o.customer.id}`} className="text-brand-dark underline">account</Link></>}</p>
          <p>{o.phone}{o.email ? ` · ${o.email}` : ''}</p>
          <p className="mt-2">{o.addressLine1}{o.addressLine2 ? `, ${o.addressLine2}` : ''}, {o.city}, {o.stateCode} {o.pincode}</p>
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line/70 text-sm">
          <h2 className="font-display text-xl font-semibold">Amounts</h2>
          <dl className="mt-2 space-y-1">
            <div className="flex justify-between"><dt>Items</dt><dd>{formatINR(o.goodsTotalPaise)}</dd></div>
            {o.discountPaise > 0 && <div className="flex justify-between text-green-800"><dt>Coupon {o.couponCode}</dt><dd>−{formatINR(o.discountPaise)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{formatINR(o.shippingPaise)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatINR(o.totalPaise)}</dd></div>
            <div className="flex justify-between text-ink/60"><dt>{o.taxKind === 'INTRA' ? 'CGST + SGST' : 'IGST'}</dt><dd>{formatINR(o.cgstPaise + o.sgstPaise + o.igstPaise)}</dd></div>
          </dl>
        </section>
      </div>

      <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-line/70 text-sm"><h2 className="font-display text-xl font-semibold">Items</h2><ul className="mt-2 divide-y divide-line">{o.items.map((it) => (<li key={it.id} className="flex justify-between py-2"><span>{it.productName} ({it.variantLabel}) × {it.qty} <span className="text-ink/50">· {it.sku}</span></span><span>{formatINR(it.lineTotalPaise)}{it.discountPaise > 0 && <span className="text-ink/50"> (−{formatINR(it.discountPaise)})</span>}</span></li>))}</ul></section>

      <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-line/70 text-sm"><h2 className="font-display text-xl font-semibold">Payments</h2>{o.payments.length === 0 ? <p className="mt-2 text-ink/60">No payment events yet.</p> : <ul className="mt-2 space-y-1">{o.payments.map((p) => (<li key={p.id}>{p.provider} · {p.providerPaymentId} · {p.status} · {formatINR(p.amountPaise)} · {p.createdAt.toLocaleString('en-IN')}</li>))}</ul>}{o.status !== 'PENDING_PAYMENT' && <p className="mt-3 text-xs text-ink/60">{manual ? 'Refund manual UPI payments from your bank or UPI app.' : 'Refunds are issued from the Razorpay dashboard.'} Then mark the order as Refunded here (the customer is notified).</p>}</section>

      {next.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {next.map((s) => (<form key={s} action={updateOrderStatusAction.bind(null, o.id, s)}><button className={`btn ${s === 'CANCELLED' || s === 'REFUNDED' ? 'btn-ghost' : 'btn-primary'}`}>Mark as {STATUS_LABEL[s].toLowerCase()}</button></form>))}
        </div>
      )}
      <p className="mt-6 flex flex-wrap gap-4 text-sm">
        {o.invoiceNo && <Link className="text-brand-dark underline" href={`/invoice/${o.publicId}`}>Open tax invoice</Link>}
        <Link className="text-brand-dark underline" href={`/order/${o.publicId}`}>Customer&apos;s order page</Link>
        <Link className="text-brand-dark underline" href={`/admin/audit?entity=Order`}>Order change history</Link>
      </p>
    </div>
  );
}
