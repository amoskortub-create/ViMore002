import { NextRequest, NextResponse } from 'next/server';

const FREE_DOMAIN = 'free.vimore.cfd';

const STATIC_PREFIXES = ['/_next', '/sw.js', '/offline.html', '/favicon', '/icon', '/manifest'];

function isStaticAsset(pathname: string): boolean {
  return STATIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const isFreeDomain = hostname === FREE_DOMAIN || hostname.startsWith('free.');

  if (isFreeDomain) {
    const isApiOrFreeModeRoute = pathname.startsWith('/api') || pathname.startsWith('/free-mode');
    if (!isApiOrFreeModeRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/free-mode' + (pathname === '/' ? '' : pathname);
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|offline\\.html).*)',
  ],
};
