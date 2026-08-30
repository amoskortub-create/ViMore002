import { NextRequest, NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { generateUSSD, isValidOrangeMoneyNumber } from '@/lib/ld-monetization';

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'You must be logged in to unlock posts.' }, { status: 401 });
  const { postId } = await req.json();
  if (!postId) return NextResponse.json({ error: 'postId is required.' }, { status: 400 });

  const db = getAdminDatabases();
  const post = await db.getDocument(DATABASE_ID, 'posts', postId);
  const creatorUserId = String(post.user_id || '');
  const amountLD = Number(post.unlock_price || 0);
  if (!creatorUserId || !Number.isInteger(amountLD) || amountLD < 100 || amountLD > 500) return NextResponse.json({ error: 'This post does not have a valid LD price.' }, { status: 400 });
  if (creatorUserId === session.userId) return NextResponse.json({ error: 'You already own this post.' }, { status: 400 });

  const accounts = await db.listDocuments(DATABASE_ID, 'creator_orange_money_accounts', [Query.equal('userId', creatorUserId), Query.equal('isVerified', true), Query.limit(1)]);
  const number = String(accounts.documents[0]?.orangeMoneyNumber || '');
  if (!isValidOrangeMoneyNumber(number)) return NextResponse.json({ error: 'This creator has no verified Orange Money account.' }, { status: 404 });

  const transactionId = ID.unique();
  await db.createDocument(DATABASE_ID, 'transactions', transactionId, { transactionId, senderUserId: session.userId, receiverUserId: creatorUserId, transactionType: 'unlock_post', amountLD, itemId: postId, itemType: 'post', status: 'pending', createdAt: new Date().toISOString() });
  const ussd = generateUSSD(number, amountLD);
  return NextResponse.json({ ok: true, transactionId, amountLD, dialerUri: `tel:${ussd.replace('#', '%23')}` });
}