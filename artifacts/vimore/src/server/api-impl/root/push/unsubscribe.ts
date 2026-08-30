import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export const maxDuration = 15;

const COLLECTION_ID = 'push_subscriptions';

export async function POST(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });

    try {
      const db = getAdminDatabases();
      const existing = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
        Query.equal('endpoint', endpoint),
        Query.limit(1),
      ]);
      if (existing.total > 0) {
        await db.deleteDocument(DATABASE_ID, COLLECTION_ID, existing.documents[0].$id);
      }
    } catch (err: any) {
      console.warn('[push/unsubscribe] storage cleanup failed:', err?.message || err);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad request' }, { status: 400 });
  }
}
