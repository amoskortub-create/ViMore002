import { NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { ID } from 'node-appwrite';

const TRANSACTIONS = 'transactions';
const TRANSACTION_TYPES = new Set(['gift', 'subscription', 'unlock_post', 'unlock_music']);
const ITEM_TYPES = new Set(['post', 'music', 'gift_item']);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getAdminDatabases();
    const amountLD = Number(body?.amountLD ?? 0);
    const transactionType = String(body?.transactionType || '');
    const itemType = body?.itemType ? String(body.itemType) : undefined;
    if (!body?.senderUserId || !body?.receiverUserId || !TRANSACTION_TYPES.has(transactionType) || !Number.isInteger(amountLD) || amountLD < 1 || (itemType && !ITEM_TYPES.has(itemType))) {
      return NextResponse.json({ error: 'Invalid transaction payload.' }, { status: 400 });
    }

    const document = {
      transactionId: body?.transactionId || ID.unique(),
      senderUserId: body?.senderUserId,
      receiverUserId: body?.receiverUserId,
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
