import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });

  const db = getAdminDatabases();
  const result = await db.listDocuments(DATABASE_ID, 'creator_earnings', [
    Query.equal('userId', session.userId),
    Query.limit(1),
  ]);
  const earnings = result.documents[0] || {
    userId: session.userId,
    totalEarningsLD: 0,
    giftsEarningsLD: 0,
    subscriptionsEarningsLD: 0,
    lockedPostsEarningsLD: 0,
    lockedMusicEarningsLD: 0,
  };
  return NextResponse.json({ earnings });
}