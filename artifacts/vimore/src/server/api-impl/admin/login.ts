import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';
import { Query } from 'node-appwrite';

export const maxDuration = 20;

const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1').replace(/\/$/, '');
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';

/** Extract the Appwrite session cookie value from a Set-Cookie header (Appwrite 1.6+). */
function extractSessionCookie(setCookieHeader: string | null, projectId: string): string {
  if (!setCookieHeader) return '';
  const match = setCookieHeader.match(new RegExp(`a_session_${projectId}=([^;,\\s]+)`));
  return match ? decodeURIComponent(match[1]) : '';
}
const ADMIN_ROLES = new Set(['SUPER', 'FINANCIAL', 'MODERATOR']);

export async function POST(req: NextRequest) {
  try {
    const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
    const rl = rateLimit(`admin-login:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait 1 minute before trying again.' },
        { status: 429 }
      );
    }

    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json({ error: 'Identifier and password are required.' }, { status: 400 });
    }

    if (typeof identifier !== 'string' || identifier.length > 256) {
      return NextResponse.json({ error: 'Invalid identifier.' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length > 256) {
      return NextResponse.json({ error: 'Invalid password.' }, { status: 400 });
    }

    const db = getAdminDatabases();

    let email: string | null = null;
    try {
      const byUsername = await db.listDocuments(DATABASE_ID, 'users', [
        Query.equal('username', identifier.replace(/^@/, '')),
        Query.limit(1),
      ]);
      if (byUsername.documents.length > 0) {
        email = byUsername.documents[0].email ?? null;
      }
    } catch { }

    if (!email && identifier.includes('@') && !identifier.includes('.cfd')) {
      email = identifier;
    }

    if (!email) {
      try {
        const byPhone = await db.listDocuments(DATABASE_ID, 'users', [
          Query.equal('phone', identifier),
          Query.limit(1),
        ]);
        if (byPhone.documents.length > 0) {
          email = byPhone.documents[0].email ?? null;
        }
      } catch { }
    }

    if (!email) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const sessionRes = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT_ID,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.json().catch(() => ({}));
      const msg: string = err?.message || '';
      if (msg.toLowerCase().includes('invalid credentials') || sessionRes.status === 401) {
        return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
    }

    const sessionData = await sessionRes.json();
    // Appwrite 1.6+: secret comes via Set-Cookie, not the JSON body (data.secret is "").
    const sessionSecret: string =
      (typeof sessionData.secret === 'string' && sessionData.secret) ||
      extractSessionCookie(sessionRes.headers.get('set-cookie'), PROJECT_ID) ||
      '';

    const accountRes = await fetch(`${ENDPOINT}/account`, {
      headers: {
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Session': sessionSecret,
      },
    });

    if (!accountRes.ok) {
      return NextResponse.json({ error: 'Could not verify account.' }, { status: 401 });
    }

    const accountData = await accountRes.json();
    const userId: string = accountData.$id;

    let role = 'USER';
    try {
      const userDoc = await db.getDocument(DATABASE_ID, 'users', userId);
      role = userDoc?.role ?? 'USER';
    } catch { }

    const authorized = ADMIN_ROLES.has(role);

    return NextResponse.json({ authorized, role, session: sessionSecret, userId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Login failed.' }, { status: 500 });
  }
}
