import type { Metadata } from 'next';
import Link from 'next/link';
import { getCustomer } from '@/server/customer-auth';
import { logoutAction } from './actions';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/profile', label: 'Profile' },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const c = await getCustomer();
  if (!c) return <>{children}</>; // the login page lives under /account too
  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My account</p>
          <p className="h-display mt-1 text-3xl">{c.name ? `Hello, ${c.name.split(' ')[0]}` : 'Hello!'}</p>
          <p className="text-sm text-ink/60">+91 {c.phone}</p>
        </div>
        <form action={logoutAction}><button className="btn btn-ghost !py-2">Log out</button></form>
      </div>
      <nav aria-label="Account" className="mt-6 flex flex-wrap gap-2 text-sm">
        {NAV.map((n) => (<Link key={n.href} href={n.href} className="rounded-full border border-line bg-white px-4 py-1.5 hover:border-brand-dark">{n.label}</Link>))}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
