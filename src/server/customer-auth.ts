import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './db';
import { CUSTOMER_COOKIE, CUSTOMER_SESSION_DAYS, signCustomerToken, verifyCustomerToken } from '@/lib/auth-token';

export async function startCustomerSession(customerId: string): Promise<void> {
  (await cookies()).set(CUSTOMER_COOKIE, await signCustomerToken(customerId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * CUSTOMER_SESSION_DAYS,
  });
}

export async function endCustomerSession(): Promise<void> {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

/** The logged-in customer, or null for guests. */
export async function getCustomer() {
  const session = await verifyCustomerToken((await cookies()).get(CUSTOMER_COOKIE)?.value);
  if (!session) return null;
  return prisma.customer.findUnique({ where: { id: session.customerId } });
}

/** For account pages and actions. Sends guests to the login page and back here afterwards. */
export async function requireCustomer(nextPath = '/account') {
  const c = await getCustomer();
  if (!c) redirect(`/account/login?next=${encodeURIComponent(nextPath)}`);
  return c;
}

/** Only allow relative in-site paths after login (no open redirects). */
export const safeNext = (next: string | null | undefined): string =>
  next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/account';
