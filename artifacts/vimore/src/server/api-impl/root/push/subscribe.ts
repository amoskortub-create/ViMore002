import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { ID, Query } from 'node-appwrite';

export const maxDuration = 15;

const COLLECTION_ID = 'push_subscriptions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys, expirationTime } = body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const userId = req.headers.get('x-user-id') || req.cookies.get('vimore_uid')?.value || null;

    try {
      const db = getAdminDatabases();
      const existing = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
        Query.equal('endpoint', endpoint),
        Query.limit(1),
      ]);

      const payload = {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        expiration_time: expirationTime ? String(expirationTime) : null,
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      if (existing.total > 0) {
        await db.updateDocument(DATABASE_ID, COLLECTION_ID, existing.documents[0].$id, payload);
      } else {
        await db.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
          ...payload,
          created_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({ ok: true });
    } catch (err: any) {
      // Collection may not exist yet; log and accept so the client doesn't retry forever.
      console.warn('[push/subscribe] storage failed:', err?.message || err);
      return NextResponse.json({ ok: true, stored: false });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad request' }, { status: 400 });
  }
}
