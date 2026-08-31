import { NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { ID } from 'node-appwrite';

const TRANSACTIONS = 'transactions';
const TRANSACTION_TYPES = new Set(['gift', 'subscription', 'unlock_post', 'unlock_music']);
const ITEM_TYPES = new Set(['post', 'music', 'gift_item']);
const LEGACY_TYPES: Record<string, string> = {
  gift: 'GIFT_SENT',
  subscription: 'SUBSCRIPTION',
  unlock_post: 'POST_UNLOCK',
  unlock_music: 'MUSIC_UNLOCK',
};

export async function POST(req: Request) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in to log a transaction.' }, { status: 401 });
    }

    const body = await req.json();
    const db = getAdminDatabases();
    const amountLD = Number(body?.amountLD ?? 0);
    const transactionType = String(body?.transactionType || '');
    const itemType = body?.itemType ? String(body.itemType) : undefined;
    const receiverUserId = String(body?.receiverUserId || '');
    if (!receiverUserId || receiverUserId === session.userId || !TRANSACTION_TYPES.has(transactionType) || !Number.isInteger(amountLD) || amountLD < 1 || (itemType && !ITEM_TYPES.has(itemType))) {
      return NextResponse.json({ error: 'Invalid transaction payload.' }, { status: 400 });
    }

    const document = {
      transactionId: body?.transactionId || ID.unique(),
      // Keep the authenticated legacy owner field populated. The live
      // transactions collection requires this field for every document.
      user_id: session.userId,
      type: LEGACY_TYPES[transactionType],
      amount: amountLD,
      currency: 'LD',
      description: `${transactionType.replace('_', ' ')} payment`,
      reference_id: body?.itemId || receiverUserId,
      from_user_id: session.userId,
      to_user_id: receiverUserId,
      senderUserId: session.userId,
      receiverUserId,
      transactionType,
      amountLD,
      ...(body?.itemId ? { itemId: body.itemId } : {}),
      ...(itemType ? { itemType } : {}),
      orangeMoneyRef: body?.orangeMoneyRef || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const created = await db.createDocument(DATABASE_ID, TRANSACTIONS, document.transactionId, document);
    return NextResponse.json({ ok: true, transaction: created });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not log transaction.' }, { status: 500 });
  }
}
