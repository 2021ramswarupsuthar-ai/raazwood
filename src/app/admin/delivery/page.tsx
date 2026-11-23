import { requireAdmin } from '@/server/admin-auth';
import { getAllZones } from '@/server/delivery';
import { Flash } from '@/components/AdminUi';
import { STATES } from '@/config/states';
import { SOUTH_STATES } from '@/config/store';
import { saveDeliveryZonesAction } from '../manage-actions';

export default async function Delivery({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  await requireAdmin();
  const { error, saved } = await searchParams;
  const zones = await getAllZones(STATES.map((s) => s.code));
  const south = new Set<string>(SOUTH_STATES);
  const ordered = [...STATES].sort((a, b) => Number(south.has(b.code)) - Number(south.has(a.code)) || a.name.localeCompare(b.name));
  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-4xl font-semibold">Delivery zones</h1>
      <p className="mt-1 text-sm text-ink/60">Per state: whether you deliver there, the delivery estimate shown to customers, and an optional extra charge added once per order (on top of each product&apos;s own delivery charge). Rows that differ from the defaults (from the code / SERVICEABLE_STATES) are marked “edited”; set a row back to the default values to clear it.</p>
      <Flash saved={saved} error={error} />
      <form action={saveDeliveryZonesAction} className="mt-6">
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line/70">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink/60"><tr><th className="px-4 py-3">State</th><th>Deliver here</th><th>Min days</th><th>Max days</th><th>Extra charge per order (₹)</th></tr></thead>
            <tbody className="divide-y divide-line">
              {ordered.map((s) => {
                const z = zones.get(s.code)!;
                return (
                  <tr key={s.code}>
                    <td className="px-4 py-2">{s.name}{south.has(s.code) && <span className="ml-2 text-xs text-brand-dark">South</span>}{z.custom && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-900">edited</span>}</td>
                    <td><input type="checkbox" name={`ok_${s.code}`} defaultChecked={z.serviceable} aria-label={`Deliver to ${s.name}`} /></td>
                    <td><input name={`min_${s.code}`} type="number" min={1} max={90} defaultValue={z.minDays} className="field !w-20 !py-1" aria-label={`${s.name} min days`} /></td>
                    <td><input name={`max_${s.code}`} type="number" min={1} max={90} defaultValue={z.maxDays} className="field !w-20 !py-1" aria-label={`${s.name} max days`} /></td>
                    <td><input name={`extra_${s.code}`} type="number" min={0} step={1} defaultValue={z.extraShippingPaise / 100} className="field !w-28 !py-1" aria-label={`${s.name} extra charge`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/60">Changes apply to new quotes and orders immediately; the chat assistant picks them up within 5 minutes.</p>
        <button className="btn btn-primary mt-4">Save delivery zones</button>
      </form>
    </div>
  );
}
