import { NextRequest, NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { generateUSSD, isValidOrangeMoneyNumber } from '@/lib/ld-monetization';

const PRICE_LD = 500;

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'You must be logged in to subscribe.' }, { status: 401 });
  const { creatorUserId } = await req.json();
  if (!creatorUserId || creatorUserId === session.userId) return NextResponse.json({ error: 'A valid creator is required.' }, { status: 400 });

  const db = getAdminDatabases();
  const creator = await db.getDocument(DATABASE_ID, 'users', creatorUserId);
  const followers = Number(creator.followers_count ?? creator.followers ?? 0);
  if (followers < 10000) return NextResponse.json({ error: `Subscriptions require 10,000 followers. This creator has ${followers}.` }, { status: 403 });

  const accounts = await db.listDocuments(DATABASE_ID, 'creator_orange_money_accounts', [Query.equal('userId', creatorUserId), Query.equal('isVerified', true), Query.limit(1)]);
  const number = String(accounts.documents[0]?.orangeMoneyNumber || '');
  if (!isValidOrangeMoneyNumber(number)) return NextResponse.json({ error: 'This creator has no verified Orange Money account.' }, { status: 404 });

  const transactionId = ID.unique();
  await db.createDocument(DATABASE_ID, 'transactions', transactionId, {
    transactionId,
    senderUserId: session.userId,
    receiverUserId: creatorUserId,
    transactionType: 'subscription',
    amountLD: PRICE_LD,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  const ussd = generateUSSD(number, PRICE_LD);
  return NextResponse.json({ ok: true, transactionId, amountLD: PRICE_LD, dialerUri: `tel:${ussd.replace('#', '%23')}` });
}