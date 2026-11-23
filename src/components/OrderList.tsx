import Link from 'next/link';
import { formatINR } from '@/lib/money';
import { STATUS_LABEL, isPaidStatus, type Status } from '@/lib/order-status';

type O = { id: string; publicId: string; status: string; createdAt: Date; totalPaise: number; items: { productName: string; qty: number }[] };

export default function OrderList({ orders }: { orders: O[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-line/70">
        <p className="font-display text-2xl">No orders yet</p>
        <p className="mt-1 text-sm text-ink/70">Orders you place with this mobile number appear here, including earlier guest orders.</p>
        <Link href="/shop" className="btn btn-primary mt-5">Shop furniture</Link>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line rounded-2xl bg-white ring-1 ring-line/70">
      {orders.map((o) => {
        const s = o.status as Status;
        return (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
            <div>
              <p className="font-medium">{o.items.map((i) => `${i.productName}${i.qty > 1 ? ` × ${i.qty}` : ''}`).join(', ')}</p>
              <p className="text-ink/60">{o.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · <span className="font-mono text-xs">{o.publicId.slice(0, 10)}</span></p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isPaidStatus(s) ? 'bg-green-50 text-green-800' : s === 'PENDING_PAYMENT' ? 'bg-amber-50 text-amber-900' : 'bg-bone text-ink/70'}`}>{STATUS_LABEL[s]}</span>
              <span className="font-semibold">{formatINR(o.totalPaise)}</span>
              <Link href={`/order/${o.publicId}`} className="text-brand-dark underline">View</Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
