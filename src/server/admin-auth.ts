import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { ADMIN_COOKIE, signAdminToken, verifyAdminToken } from '@/lib/auth-token';

export async function loginAdmin(email: string, password: string): Promise<boolean> {
  const user = await prisma.adminUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  // Always run a hash comparison to keep timing similar whether or not the user exists.
  const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) return false;
  const token = await signAdminToken(user.email);
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return true;
}

export async function logoutAdmin(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** Call at the top of every admin page and server action (defence in depth on top of middleware). */
export async function requireAdmin(): Promise<{ email: string }> {
  const session = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!session) redirect('/admin/login');
  return session;
}
