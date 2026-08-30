import { NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { ID, Query } from 'node-appwrite';

const COLLECTION = 'creator_earnings';
const TRANSACTIONS = 'transactions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body?.userId;
    const db = getAdminDatabases();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
    }

    const res = await db.listDocuments(DATABASE_ID, TRANSACTIONS, [
      Query.equal('receiverUserId', userId),
      Query.equal('status', 'completed'),
      Query.limit(500),
    ]);

    const totals = { totalEarningsLD: 0, giftsEarningsLD: 0, subscriptionsEarningsLD: 0, lockedPostsEarningsLD: 0, lockedMusicEarningsLD: 0 };

    for (const tx of res.documents) {
      const amount = Number(tx.amountLD || 0);
      totals.totalEarningsLD += amount;
      if (tx.transactionType === 'gift') totals.giftsEarningsLD += amount;
      if (tx.transactionType === 'subscription') totals.subscriptionsEarningsLD += amount;
      if (tx.transactionType === 'unlock_post') totals.lockedPostsEarningsLD += amount;
      if (tx.transactionType === 'unlock_music') totals.lockedMusicEarningsLD += amount;
    }

    const payload = {
      userId,
      totalEarningsLD: totals.totalEarningsLD,
      giftsEarningsLD: totals.giftsEarningsLD,
      subscriptionsEarningsLD: totals.subscriptionsEarningsLD,
      lockedPostsEarningsLD: totals.lockedPostsEarningsLD,
      lockedMusicEarningsLD: totals.lockedMusicEarningsLD,
      lastUpdated: new Date().toISOString(),
    };

    const existing = await db.listDocuments(DATABASE_ID, COLLECTION, [
      Query.equal('userId', userId),
      Query.limit(1),
    ]);

    const saved = existing.documents[0]
      ? await db.updateDocument(DATABASE_ID, COLLECTION, existing.documents[0].$id, payload)
      : await db.createDocument(DATABASE_ID, COLLECTION, ID.unique(), payload);

    return NextResponse.json({ ok: true, earnings: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not update creator earnings.' }, { status: 500 });
  }
}
