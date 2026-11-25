import { STATUS_LABEL, type Status } from '@/lib/order-status';

const STYLE: Record<Status, string> = {
  PENDING_PAYMENT: 'bg-amber-50 text-amber-800 ring-amber-200',
  PAID: 'bg-green-50 text-green-800 ring-green-200',
  PROCESSING: 'bg-sky-50 text-sky-800 ring-sky-200',
  SHIPPED: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  DELIVERED: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  CANCELLED: 'bg-stone-100 text-stone-600 ring-stone-200',
  EXPIRED: 'bg-stone-100 text-stone-500 ring-stone-200',
  REFUNDED: 'bg-rose-50 text-rose-800 ring-rose-200',
};

export default function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLE[s] ?? 'bg-stone-100 text-stone-700 ring-stone-200'}`}>{STATUS_LABEL[s] ?? status}</span>;
}
