import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth-token';
import { logoutAction } from './actions';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  return (
    <div className="container-x py-8">
      {session && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-walnut px-5 py-3 text-bone">
          <nav aria-label="Admin" className="flex gap-5 text-sm font-medium">
            <Link href="/admin" className="hover:text-brand">Dashboard</Link>
            <Link href="/admin/orders" className="hover:text-brand">Orders</Link>
            <Link href="/admin/products" className="hover:text-brand">Products</Link>
            <Link href="/" className="text-bone/60 hover:text-brand">View site</Link>
          </nav>
          <form action={logoutAction}><button className="text-sm text-brand hover:underline">Log out ({session.email})</button></form>
        </div>
      )}
      {children}
    </div>
  );
}
