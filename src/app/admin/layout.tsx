import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth-token';
import { prisma } from '@/server/db';
import AdminNav from '@/components/AdminNav';
import { logoutAction } from './actions';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);

  // Login page (no session): centred card on a plain background, no sidebar.
  if (!session) return <div className="admin-root grid min-h-screen place-items-center bg-[#F4F1EC] px-4 py-10">{children}</div>;

  const [utr, reviews] = await Promise.all([
    prisma.order.count({ where: { paymentMethod: 'MANUAL_UPI', status: 'PENDING_PAYMENT', utrSubmittedAt: { not: null } } }).catch(() => 0),
    prisma.review.count({ where: { status: 'PENDING' } }).catch(() => 0),
  ]);

  return (
    <div className="admin-root min-h-screen bg-[#F4F1EC] text-ink">
      <AdminNav
        counts={{ utr, reviews }}
        email={session.email}
        logout={<form action={logoutAction}><button>Log out</button></form>}
      />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
