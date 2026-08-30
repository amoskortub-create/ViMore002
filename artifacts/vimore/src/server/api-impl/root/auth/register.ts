import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { ID } from 'node-appwrite';
import { getAdminUsers } from '@/lib/appwrite-server';

const ENDPOINT = (
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1'
).replace(/\/$/, '');
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';

/**
 * Server-side account registration.
 *
 * Why: The Appwrite client SDK enforces a platform-domain check. Any domain
 * not registered under the Appwrite project's Platforms list will receive
 * general_unauthorized_scope (401) when calling account.create() or
 * account.createEmailPasswordSession(). This endpoint uses the admin Users
 * API (no platform check) to create the account, then creates a session via
 * a direct server-to-server REST call (same approach as auth/login.ts).
 *
 * Appwrite 1.6 no longer returns the session secret in the JSON body when
 * called server-to-server. Instead it sets a Set-Cookie header whose value is
 * a base64-encoded JSON { id, secret }. We extract that cookie value and
 * return it as `secret` so the client can store it in cookieFallback and send
 * it back as X-Appwrite-Session on every authenticated API call.
 */

/**
 * Extract the Appwrite session cookie value from a Set-Cookie header string.
 */
function extractSessionCookie(setCookieHeader: string | null, projectId: string): string {
  if (!setCookieHeader) return '';
  const pattern = new RegExp(`a_session_${projectId}=([^;,\\s]+)`);
  const match = setCookieHeader.match(pattern);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'email, password and name are required' },
        { status: 400 }
      );
    }

    // Create the Appwrite auth account using the admin Users API.
    // This is a server-to-server call — no platform domain check.
    const adminUsers = getAdminUsers();
    let userId: string;
    try {
      const newUser = await adminUsers.create(ID.unique(), email, undefined, password, name);
      userId = newUser.$id;
    } catch (err: any) {
      // code 409 → email already registered
      const status = err?.code === 409 ? 409 : 400;
      return NextResponse.json(
        { error: err?.message || 'Failed to create account.' },
        { status }
      );
    }

    // Create a session via direct server→Appwrite REST call.
    // Same pattern as auth/login.ts — no CORS / platform-domain restrictions.
    // Note: do NOT send X-Appwrite-Response-Format: 1.0.0 — that header
    // causes Appwrite to omit the Set-Cookie header we need to extract the session.
    const sessionRes = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT_ID,
      },
      body: JSON.stringify({ email, password }),
    });

    const sessionData = await sessionRes.json();

    if (!sessionRes.ok) {
      // Account created but session failed — let the client know so they can
      // try logging in manually rather than silently failing.
      return NextResponse.json(
        { error: sessionData?.message || 'Account created but sign-in failed. Please log in.' },
        { status: sessionRes.status }
      );
    }

    // Appwrite 1.6+: session secret comes via Set-Cookie, not sessionData.secret.
    const secret =
      (typeof sessionData.secret === 'string' && sessionData.secret) ||
      extractSessionCookie(sessionRes.headers.get('set-cookie'), PROJECT_ID);

    return NextResponse.json({
      userId,
      sessionId: sessionData.$id,
      secret,
      expire: sessionData.expire,
    });
  } catch (err: any) {
    console.error('[auth/register]', err);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
