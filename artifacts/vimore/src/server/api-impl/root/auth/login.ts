import 'server-only';
import { NextRequest, NextResponse } from 'next/server';

const ENDPOINT = (
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1'
).replace(/\/$/, '');
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';

/**
 * Server-side login — proxies the credential check directly to Appwrite's
 * REST API so it is a server-to-server call with no CORS / platform-domain
 * restrictions. The client SDK path suffers from "general_unauthorized_scope"
 * when the Replit preview domain is not registered as an Appwrite platform.
 *
 * Appwrite 1.6 no longer returns the session secret in the JSON body when
 * called server-to-server. Instead it sets a Set-Cookie header whose value is
 * a base64-encoded JSON { id, secret }. We extract that cookie value and
 * return it as `secret` so the client can store it in cookieFallback and send
 * it back as X-Appwrite-Session on every authenticated API call.
 */

/**
 * Extract the Appwrite session cookie value from a Set-Cookie header string.
 * The cookie value is a base64-encoded JSON { id, secret } that Appwrite
 * accepts as X-Appwrite-Session for subsequent requests.
 */
function extractSessionCookie(setCookieHeader: string | null, projectId: string): string {
  if (!setCookieHeader) return '';
  const pattern = new RegExp(`a_session_${projectId}=([^;,\\s]+)`);
  const match = setCookieHeader.match(pattern);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
    }

    // Direct server → Appwrite call — no platform check, no CORS.
    // Note: do NOT send X-Appwrite-Response-Format: 1.0.0 — that header
    // causes Appwrite to omit the Set-Cookie header we need to extract the session.
    const res = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT_ID,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || 'Invalid credentials.' },
        { status: res.status }
      );
    }

    // Appwrite 1.6+: session secret comes via Set-Cookie, not data.secret.
    // Fall back to data.secret for forward-compatibility if a future version restores it.
    const secret =
      (typeof data.secret === 'string' && data.secret) ||
      extractSessionCookie(res.headers.get('set-cookie'), PROJECT_ID);

    return NextResponse.json({
      sessionId: data.$id,
      secret,
      userId: data.userId,
      expire: data.expire,
    });
  } catch (err: any) {
    console.error('[auth/login]', err);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
