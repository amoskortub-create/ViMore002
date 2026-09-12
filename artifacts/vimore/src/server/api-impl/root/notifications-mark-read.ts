import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';

const NOTIFICATIONS_COLLECTION = 'notifications';

export async function POST(req: NextRequest) {
  try {
    const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
    const rl = rateLimit(`notifications-read:${ip}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.notificationIds)
      ? body.notificationIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 100)
      : [];
    if (ids.length === 0) return NextResponse.json({ ok: true, updated: 0 });

    const db = getAdminDatabases();
    let updated = 0;
    await Promise.all(ids.map(async (id: string) => {
      try {
        const doc: any = await db.getDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, id);
        if (doc.user_id !== session.userId && doc.recipient_id !== session.userId) return;
        if (doc.is_read === true) return;
        await db.updateDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, id, { is_read: true });
        updated += 1;
      } catch {
        // A stale/deleted notification should not make the whole batch fail.
      }
    }));

    return NextResponse.json({ ok: true, updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad request' }, { status: 400 });
  }
}