import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, CUSTOMER_COOKIE, verifyAdminToken, verifyCustomerToken } from '@/lib/auth-token';

function toLogin(req: NextRequest, loginPath: string, withNext: boolean) {
  const url = req.nextUrl.clone();
  url.pathname = loginPath;
  url.search = withNext ? `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}` : '';
  return NextResponse.redirect(url);
}

function noindex(res: NextResponse) {
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/account')) {
    if (pathname === '/account/login') return noindex(NextResponse.next());
    const session = await verifyCustomerToken(req.cookies.get(CUSTOMER_COOKIE)?.value);
    return session ? noindex(NextResponse.next()) : toLogin(req, '/account/login', true);
  }

  if (pathname === '/admin/login') return noindex(NextResponse.next());
  const session = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!session) return toLogin(req, '/admin/login', false);
  return noindex(NextResponse.next());
}

export const config = { matcher: ['/admin/:path*', '/account/:path*'] };
