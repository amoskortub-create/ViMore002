import 'server-only';
import { NextRequest, NextResponse } from 'next/server';

const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';

/**
 * Clear the same-origin session backup used by the Android WebView.
 *
 * Appwrite session deletion is still attempted by the client, but it can
 * fail when the JavaScript context has been recreated and the SDK no longer
 * has its in-memory session. Clearing this cookie must not depend on that SDK
 * call succeeding.
 */
export async function POST(_req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(`a_session_${PROJECT_ID}`, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}