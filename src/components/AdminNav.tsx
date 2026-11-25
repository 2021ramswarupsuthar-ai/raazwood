'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type Item = { href: string; label: string; icon: string; badge?: number };
type Group = { title: string; items: Item[] };

// 24x24 stroke icon paths
const ICON: Record<string, string> = {
  dash: 'M4 13h6V4H4v9Zm10 7h6V4h-6v16ZM4 20h6v-3H4v3Z',
  orders: 'M6 3h12l2 4v13H4V7l2-4Zm-2 4h16M9 11h6',
  pay: 'M3 7h18v10H3zM3 11h18M7 15h3',
  users: 'M16 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM5 20c0-3 3-5 7-5s7 2 7 5',
  tag: 'M3 12V4h8l10 10-8 8L3 12Zm5-4h.01',
  box: 'M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 8 8-4M12 11v10M12 11 4 7',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z',
  pen: 'M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4',
  image: 'M4 5h16v14H4V5Zm0 11 4-4 3 3 4-5 5 6M9 9.5v.01',
  truck: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 18.5v.01M17 18.5v.01',
  log: 'M6 3h9l4 4v14H6V3Zm3 8h7M9 15h7',
  out: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
};

export function Icon({ name }: { name: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d={ICON[name]} /></svg>;
}

export default function AdminNav({ counts, email, logout }: { counts: { utr: number; reviews: number }; email: string; logout: React.ReactNode }) {
  const path = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  const groups: Group[] = [
    { title: 'Overview', items: [{ href: '/admin', label: 'Dashboard', icon: 'dash' }] },
    { title: 'Sales', items: [
      { href: '/admin/orders', label: 'Orders', icon: 'orders', badge: counts.utr },
      { href: '/admin/payments', label: 'Payments', icon: 'pay' },
      { href: '/admin/customers', label: 'Customers', icon: 'users' },
      { href: '/admin/coupons', label: 'Coupons', icon: 'tag' },
    ] },
    { title: 'Catalog', items: [
      { href: '/admin/products', label: 'Products', icon: 'box' },
      { href: '/admin/categories', label: 'Categories', icon: 'grid' },
      { href: '/admin/reviews', label: 'Reviews', icon: 'star', badge: counts.reviews },
    ] },
    { title: 'Store', items: [
      { href: '/admin/hero', label: 'Homepage hero', icon: 'image' },
      { href: '/admin/blog', label: 'Blog / guides', icon: 'pen' },
      { href: '/admin/delivery', label: 'Delivery zones', icon: 'truck' },
      { href: '/admin/audit', label: 'Audit log', icon: 'log' },
    ] },
  ];
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path === href || path.startsWith(href + '/'));

  const nav = (
    <nav aria-label="Admin" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-bone/40">{g.title}</p>
          <ul className="mt-2 space-y-0.5">
            {g.items.map((it) => (
              <li key={it.href}>
                <Link href={it.href} onClick={() => setOpen(false)} aria-current={active(it.href) ? 'page' : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active(it.href) ? 'bg-brand/20 font-semibold text-brand' : 'text-bone/75 hover:bg-white/5 hover:text-bone'}`}>
                  <Icon name={it.icon} />
                  <span className="flex-1">{it.label}</span>
                  {it.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-walnut">{it.badge}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-3">
      <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-bone/75 hover:bg-white/5 hover:text-bone"><Icon name="eye" /> View storefront</Link>
      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
        <span className="min-w-0"><span className="block text-[11px] text-bone/50">Signed in</span><span className="block truncate text-xs text-bone">{email}</span></span>
        <span className="text-xs [&_button]:inline-flex [&_button]:items-center [&_button]:gap-1 [&_button]:text-brand [&_button]:hover:underline">{logout}</span>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-walnut lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5"><span className="font-display text-xl font-semibold text-bone">Raazwood</span><span className="rounded bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">Admin</span></div>
        {nav}
        {footer}
      </aside>

      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-walnut px-4 text-bone lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="inline-flex items-center gap-2 text-sm font-medium"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg> Menu</button>
        <span className="font-display text-lg font-semibold">Raazwood <span className="text-xs font-sans text-brand">Admin</span></span>
        {counts.utr + counts.reviews > 0 ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-amber-400 px-1.5 text-xs font-bold text-walnut">{counts.utr + counts.reviews}</span> : <span className="w-6" />}
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-walnut">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4 text-bone"><span className="font-display text-lg font-semibold">Raazwood Admin</span><button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="text-2xl leading-none">×</button></div>
            {nav}
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
