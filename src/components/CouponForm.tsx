import { Field } from './AdminUi';

type C = { code?: string; description?: string; kind?: 'PERCENT' | 'FLAT'; value?: number; minOrderPaise?: number; maxDiscountPaise?: number | null; startsAt?: Date | null; endsAt?: Date | null; usageLimit?: number | null; isActive?: boolean };

// dates are shown and typed in IST
const ist = (d?: Date | null) => (d ? new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10) : undefined);

export default function CouponForm({ action, c = {}, submit }: { action: (fd: FormData) => void | Promise<void>; c?: C; submit: string }) {
  const value = c.value === undefined ? undefined : c.kind === 'FLAT' ? c.value / 100 : c.value;
  return (
    <form action={action} className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-line/70">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="code" label="Code" value={c.code} required max={24} hint="Customers type this at checkout. Letters, numbers, - and _." />
        <Field name="description" label="Internal note" value={c.description} max={200} placeholder="e.g. Diwali 2026 campaign" />
        <div>
          <label className="label" htmlFor="kind">Type</label>
          <select id="kind" name="kind" defaultValue={c.kind ?? 'PERCENT'} className="field"><option value="PERCENT">Percent off goods</option><option value="FLAT">Flat ₹ off goods</option></select>
        </div>
        <Field name="value" label="Value (percent, or ₹ for flat)" type="number" step="1" value={value} required />
        <Field name="minOrderRupees" label="Minimum goods value (₹)" type="number" step="1" value={(c.minOrderPaise ?? 0) / 100} />
        <Field name="maxDiscountRupees" label="Maximum discount (₹, percent coupons)" type="number" step="1" value={c.maxDiscountPaise ? c.maxDiscountPaise / 100 : undefined} hint="Leave empty for no cap" />
        <Field name="startsAt" label="Valid from (optional)" type="date" value={ist(c.startsAt)} />
        <Field name="endsAt" label="Valid until (optional, inclusive)" type="date" value={ist(c.endsAt)} />
        <Field name="usageLimit" label="Total uses allowed (optional)" type="number" step="1" value={c.usageLimit} hint="Counted on paid orders" />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={c.isActive ?? true} /> Active</label>
      <p className="text-xs text-ink/60">Discounts apply to goods only (not delivery). GST is recalculated on the discounted price and shown on the invoice.</p>
      <button className="btn btn-primary">{submit}</button>
    </form>
  );
}
