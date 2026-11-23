import Link from 'next/link';

export type ListParams = { q?: string; sort?: string; min?: string; max?: string; stock?: string; page?: string };

/** Turn URL search params into catalogue options (prices typed in rupees, stored in paise). */
export function parseListParams(sp: ListParams) {
  const rupees = (v?: string) => {
    const n = Number(v);
    return v && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
  };
  return {
    q: sp.q?.trim().slice(0, 60) || undefined,
    sort: ['price-asc', 'price-desc', 'discount'].includes(sp.sort ?? '') ? sp.sort : undefined,
    minPaise: rupees(sp.min),
    maxPaise: rupees(sp.max),
    inStock: sp.stock === '1',
    page: Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1),
  };
}

export const isFiltered = (sp: ListParams) => Boolean(sp.q || sp.sort || sp.min || sp.max || sp.stock || (sp.page && sp.page !== '1'));

/** Plain GET form: works without JavaScript and keeps filter URLs shareable. */
export default function ShopFilters({ action, sp }: { action: string; sp: ListParams }) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 text-sm ring-1 ring-line/70" aria-label="Filter products">
      {sp.q ? <input type="hidden" name="q" value={sp.q} /> : null}
      <div><label htmlFor="min" className="label">Min price (₹)</label><input id="min" name="min" type="number" min={0} step={500} defaultValue={sp.min} className="field !w-32 !py-1.5" /></div>
      <div><label htmlFor="max" className="label">Max price (₹)</label><input id="max" name="max" type="number" min={0} step={500} defaultValue={sp.max} className="field !w-32 !py-1.5" /></div>
      <div>
        <label htmlFor="sort" className="label">Sort</label>
        <select id="sort" name="sort" defaultValue={sp.sort ?? ''} className="field !w-auto !py-1.5">
          <option value="">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="discount">Biggest discount</option>
        </select>
      </div>
      <label className="flex items-center gap-2 pb-2"><input type="checkbox" name="stock" value="1" defaultChecked={sp.stock === '1'} /> In stock only</label>
      <button className="btn btn-primary !px-5 !py-2">Apply</button>
      {isFiltered({ ...sp, q: undefined }) && <Link href={sp.q ? `${action}?q=${encodeURIComponent(sp.q)}` : action} className="pb-2 text-brand-dark underline">Clear filters</Link>}
    </form>
  );
}

export function Pagination({ base, sp, page, pages }: { base: string; sp: ListParams; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (n: number) => {
    const u = new URLSearchParams(Object.entries({ ...sp, page: n > 1 ? String(n) : undefined }).filter(([, v]) => v) as [string, string][]);
    const qs = u.toString();
    return qs ? `${base}?${qs}` : base;
  };
  return (
    <nav aria-label="Pages" className="mt-10 flex flex-wrap items-center justify-center gap-2 text-sm">
      {page > 1 && <Link href={href(page - 1)} className="rounded-full border border-line bg-white px-4 py-1.5 hover:border-brand-dark">← Previous</Link>}
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <Link key={n} href={href(n)} aria-current={n === page ? 'page' : undefined} className={`grid h-9 w-9 place-items-center rounded-full border ${n === page ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white hover:border-brand-dark'}`}>{n}</Link>
      ))}
      {page < pages && <Link href={href(page + 1)} className="rounded-full border border-line bg-white px-4 py-1.5 hover:border-brand-dark">Next →</Link>}
    </nav>
  );
}
