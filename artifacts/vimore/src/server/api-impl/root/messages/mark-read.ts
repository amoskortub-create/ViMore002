import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';
import { Query } from 'node-appwrite';

export const maxDuration = 15;

const MESSAGES_COLLECTION = 'messages';

/**
 * Marks all unread messages addressed to the authenticated user as read.
 * The recipientId is derived from the verified session — never from the body —
 * so a caller cannot mark another user's messages as read.
 *
 * For the push-notification service-worker path, the session cookie is included
 * automatically by the browser on same-origin fetch requests (credentials: 'include').
 */
export async function POST(req: NextRequest) {
  try {
    const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
    const rl = rateLimit(`mark-read:${ip}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    // Recipient identity from session only — body's recipientId is ignored
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { senderId, clusterId } = body;

    const db = getAdminDatabases();

    const filters: any[] = [
      Query.equal('receiver_id', session.userId), // always the authenticated user
      Query.equal('is_read', false),
      Query.limit(100),
    ];
    if (senderId) filters.push(Query.equal('sender_id', senderId));
    if (clusterId) filters.push(Query.equal('cluster_id', clusterId));

    let updated = 0;
    try {
      const res = await db.listDocuments(DATABASE_ID, MESSAGES_COLLECTION, filters);
      await Promise.all(
        res.documents.map(async (doc: any) => {
          try {
            await db.updateDocument(DATABASE_ID, MESSAGES_COLLECTION, doc.$id, { is_read: true });
            updated++;
          } catch { /* ignore individual failures */ }
        })
      );
    } catch (err: any) {
      console.warn('[messages/mark-read] failed:', err?.message || err);
    }

    return NextResponse.json({ ok: true, updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad request' }, { status: 400 });
  }
}
