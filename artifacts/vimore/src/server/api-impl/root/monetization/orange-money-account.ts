import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { isValidOrangeMoneyNumber } from '@/lib/ld-monetization';

const COLLECTION = 'creator_orange_money_accounts';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  const result = await getAdminDatabases().listDocuments(DATABASE_ID, COLLECTION, [Query.equal('userId', session.userId), Query.limit(1)]);
  return NextResponse.json({ account: result.documents[0] || null });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });

  const body = await req.json();
  const orangeMoneyNumber = String(body?.orangeMoneyNumber || '').trim();
  const accountName = String(body?.accountName || '').trim();
  if (!accountName || !isValidOrangeMoneyNumber(orangeMoneyNumber)) {
    return NextResponse.json({ error: 'Enter an account name and a valid Orange Money number.' }, { status: 400 });
  }

  const db = getAdminDatabases();
  const existing = await db.listDocuments(DATABASE_ID, COLLECTION, [Query.equal('userId', session.userId), Query.limit(1)]);
  const now = new Date().toISOString();
  const data = { userId: session.userId, orangeMoneyNumber, accountName, isVerified: false, createdAt: existing.documents[0]?.createdAt || now, updatedAt: now };
  const account = existing.documents[0]
    ? await db.updateDocument(DATABASE_ID, COLLECTION, existing.documents[0].$id, data)
    : await db.createDocument(DATABASE_ID, COLLECTION, session.userId, data);
  return NextResponse.json({ ok: true, account });
}
