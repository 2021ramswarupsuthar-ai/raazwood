import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth-token';
import { logoutAction } from './actions';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const NAV = [
  ['/admin', 'Dashboard'],
  ['/admin/orders', 'Orders'],
  ['/admin/payments', 'Payments'],
  ['/admin/products', 'Products'],
  ['/admin/categories', 'Categories'],
  ['/admin/customers', 'Customers'],
  ['/admin/coupons', 'Coupons'],
  ['/admin/reviews', 'Reviews'],
  ['/admin/blog', 'Blog'],
  ['/admin/delivery', 'Delivery'],
  ['/admin/audit', 'Audit log'],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  return (
    <div className="container-x py-8">
      {session && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-walnut px-5 py-3 text-bone">
          <nav aria-label="Admin" className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
            {NAV.map(([href, label]) => <Link key={href} href={href} className="hover:text-brand">{label}</Link>)}
            <Link href="/" className="text-bone/60 hover:text-brand">View site</Link>
          </nav>
          <form action={logoutAction}><button className="text-sm text-brand hover:underline">Log out ({session.email})</button></form>
        </div>
      )}
      {children}
    </div>
  );
}
