import { NextRequest, NextResponse } from 'next/server';

const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';

const SESSION_COOKIE = `a_session_${PROJECT_ID}`;
const SESSION_COOKIE_LEGACY = `a_session_${PROJECT_ID}_legacy`;

export function middleware(request: NextRequest) {
  // Admin routes handle their own authentication via the Command Core login screen.
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
