import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import OrderPoller from '@/components/OrderPoller';
import { getOrderByPublicId } from '@/server/orders';
import { formatINR } from '@/lib/money';
import { STATUS_LABEL, isPaidStatus, type Status } from '@/lib/order-status';
import { stateByCode } from '@/config/states';
import { STORE } from '@/config/store';

export const metadata: Metadata = { title: 'Your order', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const o = await getOrderByPublicId(publicId);
  if (!o) notFound();
  const status = o.status as Status;
  const paid = isPaidStatus(status);
  const pending = status === 'PENDING_PAYMENT';
  const wa = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Hello Raazwood, my order ${o.publicId}`)}`;

  return (
    <div className="container-x max-w-3xl py-12">
      {pending && <OrderPoller publicId={o.publicId} />}
      <p className="eyebrow">Order</p>
      <h1 className="h-display mt-2 text-4xl md:text-5xl">{paid ? 'Thank you! Your order is confirmed' : pending ? 'Confirming your payment…' : `Order ${STATUS_LABEL[status].toLowerCase()}`}</h1>
      <p className="mt-3 text-ink/70">
        {paid && 'We have received your payment and will start processing your order. We will contact you on your mobile number for delivery updates.'}
        {pending && 'This usually takes a few seconds. If you have already paid, please keep this page open. It will update automatically.'}
        {!paid && !pending && 'If you think this is a mistake, please contact us on WhatsApp with your order reference.'}
      </p>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-ink/60">Order reference</dt><dd className="break-all font-mono font-semibold">{o.publicId}</dd></div>
          <div><dt className="text-ink/60">Status</dt><dd className="font-semibold">{STATUS_LABEL[status]}</dd></div>
          {o.invoiceNo && <div><dt className="text-ink/60">Invoice</dt><dd className="font-semibold">{o.invoiceNo}</dd></div>}
          <div><dt className="text-ink/60">Deliver to</dt><dd>{o.customerName}, {o.addressLine1}{o.addressLine2 ? `, ${o.addressLine2}` : ''}, {o.city}, {stateByCode(o.stateCode)?.name} {o.pincode}</dd></div>
        </dl>
        <ul className="mt-6 divide-y divide-line text-sm">
          {o.items.map((it) => (<li key={it.id} className="flex justify-between gap-3 py-3"><span>{it.productName} <span className="text-ink/60">({it.variantLabel}) × {it.qty}</span></span><span className="font-medium">{formatINR(it.lineTotalPaise)}</span></li>))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>Items</dt><dd>{formatINR(o.goodsTotalPaise)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{o.shippingPaise === 0 ? 'Free' : formatINR(o.shippingPaise)}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Total paid (incl. GST)</dt><dd>{formatINR(o.totalPaise)}</dd></div>
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {paid && o.invoiceNo && <Link href={`/invoice/${o.publicId}`} className="btn btn-primary">View tax invoice</Link>}
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Message us on WhatsApp</a>
        <Link href="/shop" className="btn btn-ghost">Continue shopping</Link>
      </div>
      <p className="mt-4 text-xs text-ink/60">Save this page&apos;s link: it is your order tracking link.</p>
    </div>
  );
}
