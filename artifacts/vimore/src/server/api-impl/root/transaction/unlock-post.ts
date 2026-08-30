import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { ID, Query } from 'node-appwrite';
import { logSecurityEvent, extractRequestMeta } from '@/lib/security-logger';
import { calculatePlatformFee, PLATFORM_FEE_PERCENT } from '@/lib/transaction-fee';

export const maxDuration = 30;

const COL = {
  USERS: 'users',
  POSTS: 'posts',
  POST_UNLOCKS: 'post_unlocks',
  TRANSACTIONS: 'transactions',
};

export async function POST(req: NextRequest) {
  const meta = extractRequestMeta(req);
  try {
    const ip = meta.ip_address;
    const rl = rateLimit(`unlock-post:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      void logSecurityEvent({ ...meta, event_type: 'RATE_LIMITED', severity: 'WARN', result: 'blocked', details: 'Unlock-post rate limit exceeded' });
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      void logSecurityEvent({ ...meta, event_type: 'AUTH_FAILURE', severity: 'WARN', result: 'blocked', details: 'Unauthenticated unlock-post attempt' });
      return NextResponse.json({ error: 'You must be logged in to unlock posts.' }, { status: 401 });
    }

    const { postId } = await req.json();
    if (!postId) {
      return NextResponse.json({ error: 'postId is required.' }, { status: 400 });
    }

    const db = getAdminDatabases();

    // Check for duplicate unlock (idempotent)
    const existing = await db.listDocuments(DATABASE_ID, COL.POST_UNLOCKS, [
      Query.equal('post_id', postId),
      Query.equal('user_id', session.userId),
      Query.limit(1),
    ]);
    if (existing.total > 0) {
      return NextResponse.json({ ok: true, alreadyUnlocked: true });
    }

    // Read price from the post document — never trust client-sent price
    let postDoc: any;
    try {
      postDoc = await db.getDocument(DATABASE_ID, COL.POSTS, postId);
    } catch {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    // credit_balance is an INTEGER field — round cost to whole credits
    const cost: number = Math.round(Number(postDoc.unlock_price ?? 0));
    if (cost <= 0) {
      // Post is free — just create the unlock record
      await db.createDocument(DATABASE_ID, COL.POST_UNLOCKS, ID.unique(), {
        post_id: postId,
        user_id: session.userId,
      } as any);
      return NextResponse.json({ ok: true, cost: 0, senderNewBalance: null });
    }

    const ownerId: string | null = postDoc.user_id || null;
    if (ownerId === session.userId) {
      // Owner always has access — just create the unlock record
      await db.createDocument(DATABASE_ID, COL.POST_UNLOCKS, ID.unique(), {
        post_id: postId,
        user_id: session.userId,
      } as any);
      return NextResponse.json({ ok: true, cost: 0, senderNewBalance: null });
    }

    // Server-side balance read
    let buyerDoc: any;
    try {
      buyerDoc = await db.getDocument(DATABASE_ID, COL.USERS, session.userId);
    } catch {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const buyerBalance: number = Math.round(Number(buyerDoc.credit_balance ?? buyerDoc.diamond_balance ?? 0));
    if (buyerBalance < cost) {
      void logSecurityEvent({ ...meta, event_type: 'UNLOCK_INSUFFICIENT_BALANCE', severity: 'WARN', user_id: session.userId, target_id: postId, amount: cost, currency: 'CREDIT', result: 'blocked', details: `Balance ${buyerBalance} < cost ${cost}` });
      return NextResponse.json(
        { error: `Insufficient Credits. You need ${cost} but have ${buyerBalance}.` },
        { status: 400 }
      );
    }

    // Read creator for the earning credit. Verification does not change the fee.
    let ownerDoc: any = null;
    if (ownerId) {
      try { ownerDoc = await db.getDocument(DATABASE_ID, COL.USERS, ownerId); } catch { /* ignore */ }
    }
    const platformFee = calculatePlatformFee(cost);
    const creatorShare = cost - platformFee;

    const buyerNewBalance = buyerBalance - cost;

    // Deduct buyer first
    await db.updateDocument(DATABASE_ID, COL.USERS, session.userId, {
      credit_balance: buyerNewBalance,
      diamond_balance: buyerNewBalance,
    });

    const ops: Promise<any>[] = [
      db.createDocument(DATABASE_ID, COL.POST_UNLOCKS, ID.unique(), {
        post_id: postId,
        user_id: session.userId,
      } as any),
      db.createDocument(DATABASE_ID, COL.TRANSACTIONS, ID.unique(), {
        user_id: session.userId,
        type: 'POST_UNLOCK',
        currency: 'CREDIT',
        amount: cost,
        description: `Post unlock — ${platformFee} Credits platform fee (${PLATFORM_FEE_PERCENT}%)`,
        reference_id: postId,
        status: 'COMPLETED',
      } as any),
    ];

    if (ownerId && ownerDoc) {
      const ownerCurrentBalance: number = Math.round(Number(ownerDoc.credit_balance ?? ownerDoc.diamond_balance ?? 0));
      const ownerNewBalance = ownerCurrentBalance + creatorShare;
      ops.push(
        db.updateDocument(DATABASE_ID, COL.USERS, ownerId, {
          credit_balance: ownerNewBalance,
          diamond_balance: ownerNewBalance,
        } as any),
        db.createDocument(DATABASE_ID, COL.TRANSACTIONS, ID.unique(), {
          user_id: ownerId,
          type: 'POST_UNLOCK_EARNING',
          currency: 'CREDIT',
          amount: creatorShare,
          description: `Post unlock earning — kept ${100 - PLATFORM_FEE_PERCENT}% after ${platformFee} Credits platform fee`,
          reference_id: postId,
          status: 'COMPLETED',
          from_user_id: session.userId,
          from_user_name: buyerDoc.username || buyerDoc.name || '',
          from_user_avatar: buyerDoc.avatar || '',
        } as any)
      );
    }

    try {
      await Promise.all(ops);
    } catch (err) {
      // Best-effort rollback
      try {
        await db.updateDocument(DATABASE_ID, COL.USERS, session.userId, {
          credit_balance: buyerBalance,
          diamond_balance: buyerBalance,
        });
      } catch { /* rollback failed */ }
      void logSecurityEvent({ ...meta, event_type: 'UNLOCK_FAILED', severity: 'ERROR', user_id: session.userId, target_id: postId, amount: cost, currency: 'CREDIT', result: 'failure', details: (err as any)?.message ?? 'Unknown error — buyer rolled back' });
      throw err;
    }

    void logSecurityEvent({ ...meta, event_type: 'POST_UNLOCKED', severity: 'INFO', user_id: session.userId, target_id: postId, amount: cost, currency: 'CREDIT', result: 'success', details: `Fee ${platformFee} Credits (${PLATFORM_FEE_PERCENT}%, minimum 1). Creator received ${creatorShare} Credits.` });

    return NextResponse.json({ ok: true, cost, senderNewBalance: buyerNewBalance, creatorShare, platformFee });
  } catch (err: any) {
    void logSecurityEvent({ ...meta, event_type: 'UNLOCK_ERROR', severity: 'ERROR', result: 'failure', details: err?.message ?? 'Unhandled error' });
    return NextResponse.json({ error: err?.message || 'Unlock failed.' }, { status: 500 });
  }
}
