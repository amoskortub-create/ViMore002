import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';

const NOTIFICATIONS_COLLECTION = 'notifications';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const db = getAdminDatabases();
    const baseQueries = [
      Query.notEqual('type', 'CALL_INCOMING'),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ];

    // Older notification records use user_id while some newer records use
    // recipient_id. Read both shapes so mobile and web see the same inbox.
    const [userOwned, recipientOwned] = await Promise.allSettled([
      db.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION, [
        Query.equal('user_id', session.userId),
        ...baseQueries,
      ]),
      db.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION, [
        Query.equal('recipient_id', session.userId),
        ...baseQueries,
      ]),
    ]);

    const userDocuments = userOwned.status === 'fulfilled' ? userOwned.value.documents : [];
    const recipientDocuments = recipientOwned.status === 'fulfilled' ? recipientOwned.value.documents : [];
    const documents = [...userDocuments, ...recipientDocuments]
      .filter((doc, index, all) => all.findIndex(item => item.$id === doc.$id) === index)
      .sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
      .slice(0, 100);

    return NextResponse.json({ documents });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Could not load notifications.' },
      { status: 500 },
    );
  }
}