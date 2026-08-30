import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 15;

const USERS_COLLECTION = 'users';

async function ensurePresenceAttributes(db: ReturnType<typeof getAdminDatabases>) {
  const rawDb = db as any;

  const tryCreate = async (fn: () => Promise<any>) => {
    try { await fn(); } catch { }
  };

  await tryCreate(() =>
    rawDb.createBooleanAttribute(DATABASE_ID, USERS_COLLECTION, 'is_online', false, false)
  );

  await tryCreate(() =>
    rawDb.createStringAttribute(DATABASE_ID, USERS_COLLECTION, 'last_seen_at', 64, false, undefined, undefined)
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    const rl = rateLimit(`presence:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // Auth guard — only let the session owner update their own presence
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, isOnline } = body;

    // Ensure the session owner can only update their own presence
    if (userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    if (!userId || typeof userId !== 'string' || userId.length > 64 || !/^[a-zA-Z0-9._-]+$/.test(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    const userRl = rateLimit(`presence-uid:${userId}`, 20, 60_000);
    if (!userRl.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const db = getAdminDatabases();
    const now = new Date().toISOString();
    const payload = { is_online: Boolean(isOnline), last_seen_at: now };

    try {
      await db.updateDocument(DATABASE_ID, USERS_COLLECTION, userId, payload);
      return NextResponse.json({ ok: true });
    } catch (updateErr: any) {
      const code = updateErr?.code ?? 0;
      const msg: string = updateErr?.message ?? '';

      if (code === 400 || msg.includes('Unknown attribute') || msg.includes('attribute')) {
        await ensurePresenceAttributes(db);
        await new Promise(r => setTimeout(r, 2000));
        await db.updateDocument(DATABASE_ID, USERS_COLLECTION, userId, payload);
        return NextResponse.json({ ok: true, created: true });
      }

      throw updateErr;
    }
  } catch (err: any) {
    console.error('[presence] POST error:', err?.message ?? err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
