import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth-token';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();
  const session = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

export const config = { matcher: ['/admin/:path*'] };
