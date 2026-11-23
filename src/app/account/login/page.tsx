import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import OtpLogin from '@/components/OtpLogin';
import { getCustomer, safeNext } from '@/server/customer-auth';

export const metadata: Metadata = { title: 'Log in', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNext(next);
  if (await getCustomer()) redirect(target);
  return (
    <div className="container-x py-16">
      <OtpLogin next={target} />
    </div>
  );
}
