import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { ID } from 'node-appwrite';
import { logSecurityEvent, extractRequestMeta } from '@/lib/security-logger';
import { calculatePlatformFee, PLATFORM_FEE_PERCENT } from '@/lib/transaction-fee';

export const maxDuration = 30;

const COL = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  NOTIFICATIONS: 'notifications',
};

// Credits are the in-app, non-withdrawable spending balance used for gifts.
// Gifts start at 3 Credits and use the shared 10% fee with a 1-Credit minimum.
const MIN_GIFT = 3;
const MAX_GIFT = 100_000;

export async function POST(req: NextRequest) {
  const meta = extractRequestMeta(req);
  try {
    const ip = meta.ip_address;
    const rl = rateLimit(`gift:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      void logSecurityEvent({ ...meta, event_type: 'RATE_LIMITED', severity: 'WARN', result: 'blocked', details: 'Gift rate limit exceeded' });
      return NextResponse.json({ error: 'Too many gift requests. Slow down.' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      void logSecurityEvent({ ...meta, event_type: 'AUTH_FAILURE', severity: 'WARN', result: 'blocked', details: 'Unauthenticated gift attempt' });
      return NextResponse.json({ error: 'You must be logged in to send gifts.' }, { status: 401 });
    }

    const { recipientId, amount } = await req.json();
    if (!recipientId || !amount) {
      return NextResponse.json({ error: 'recipientId and amount are required.' }, { status: 400 });
    }
    if (recipientId === session.userId) {
      void logSecurityEvent({ ...meta, event_type: 'GIFT_SELF', severity: 'WARN', user_id: session.userId, result: 'blocked', details: 'Attempted self-gift' });
      return NextResponse.json({ error: 'Cannot gift yourself.' }, { status: 400 });
    }

    // Parse as integer — credit_balance is an integer field
    const cost = Math.round(Number(amount));
    if (!Number.isFinite(cost) || cost < MIN_GIFT || cost > MAX_GIFT) {
      void logSecurityEvent({ ...meta, event_type: 'GIFT_INVALID_AMOUNT', severity: 'WARN', user_id: session.userId, amount: cost, currency: 'CREDIT', result: 'blocked', details: `Amount ${amount} out of range [${MIN_GIFT}, ${MAX_GIFT}]` });
      return NextResponse.json({ error: `Gift amount must be between ${MIN_GIFT} and ${MAX_GIFT} Credits.` }, { status: 400 });
    }

    const db = getAdminDatabases();

    // Server-side balance read — never trust the client
    let senderDoc: any;
    try {
      senderDoc = await db.getDocument(DATABASE_ID, COL.USERS, session.userId);
    } catch {
      return NextResponse.json({ error: 'Sender not found.' }, { status: 404 });
    }

    const senderBalance: number = Math.round(Number(senderDoc.credit_balance ?? senderDoc.diamond_balance ?? 0));
    if (senderBalance < cost) {
      void logSecurityEvent({ ...meta, event_type: 'GIFT_INSUFFICIENT_BALANCE', severity: 'WARN', user_id: session.userId, target_id: recipientId, amount: cost, currency: 'CREDIT', result: 'blocked', details: `Balance ${senderBalance} < cost ${cost}` });
      return NextResponse.json(
        { error: `Insufficient Credits. You have ${senderBalance} but tried to send ${cost}.` },
        { status: 400 }
      );
    }

    // Read recipient from server
    let recipientDoc: any;
    try {
      recipientDoc = await db.getDocument(DATABASE_ID, COL.USERS, recipientId);
    } catch {
      return NextResponse.json({ error: 'Recipient not found.' }, { status: 404 });
    }

    const platformFee = calculatePlatformFee(cost);
    const creatorShare = cost - platformFee;

    const senderNewBalance = senderBalance - cost;
    const recipientCurrentBalance: number = Math.round(Number(recipientDoc.credit_balance ?? recipientDoc.diamond_balance ?? 0));
    const recipientNewBalance = recipientCurrentBalance + creatorShare;

    // Deduct sender first
    await db.updateDocument(DATABASE_ID, COL.USERS, session.userId, {
      credit_balance: senderNewBalance,
      diamond_balance: senderNewBalance,
    });

    try {
      await Promise.all([
        // Credit recipient with their share after platform fee
        db.updateDocument(DATABASE_ID, COL.USERS, recipientId, {
          credit_balance: recipientNewBalance,
          diamond_balance: recipientNewBalance,
        }),
        // Sender transaction record
        db.createDocument(DATABASE_ID, COL.TRANSACTIONS, ID.unique(), {
          user_id: session.userId,
          type: 'GIFT_SENT',
          currency: 'CREDIT',
          amount: cost,
          description: `Gift sent to @${recipientDoc.username || recipientId} — ${platformFee} Credits platform fee (${PLATFORM_FEE_PERCENT}%)`,
          reference_id: recipientId,
          status: 'COMPLETED',
        }),
        // Recipient transaction record
        db.createDocument(DATABASE_ID, COL.TRANSACTIONS, ID.unique(), {
          user_id: recipientId,
          type: 'GIFT_RECEIVED',
          currency: 'CREDIT',
          amount: creatorShare,
          description: `Gift received from @${senderDoc.username || session.userId} — you kept ${100 - PLATFORM_FEE_PERCENT}% after the platform fee`,
          reference_id: session.userId,
          status: 'COMPLETED',
          from_user_id: session.userId,
          from_user_name: senderDoc.username || senderDoc.name || '',
          from_user_avatar: senderDoc.avatar || '',
        }),
        // Notify recipient
        db.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
          user_id: recipientId,
          from_user_id: session.userId,
          type: 'GIFT',
          title: 'You received a gift!',
          content: `@${senderDoc.username || 'Someone'} sent you ${creatorShare} Credits`,
          message: `@${senderDoc.username || 'Someone'} sent you ${creatorShare} Credits`,
          is_read: false,
        }),
      ]);
    } catch (err) {
      // Best-effort rollback of sender deduction
      try {
        await db.updateDocument(DATABASE_ID, COL.USERS, session.userId, {
          credit_balance: senderBalance,
          diamond_balance: senderBalance,
        });
      } catch { /* rollback failed */ }
      void logSecurityEvent({ ...meta, event_type: 'GIFT_FAILED', severity: 'ERROR', user_id: session.userId, target_id: recipientId, amount: cost, currency: 'CREDIT', result: 'failure', details: (err as any)?.message ?? 'Unknown error — sender rolled back' });
      throw err;
    }

    void logSecurityEvent({ ...meta, event_type: 'GIFT_SENT', severity: 'INFO', user_id: session.userId, target_id: recipientId, amount: cost, currency: 'CREDIT', result: 'success', details: `Fee ${platformFee} Credits (${PLATFORM_FEE_PERCENT}%, minimum 1). Creator received ${creatorShare} Credits.` });

    return NextResponse.json({
      ok: true,
      senderNewBalance,
      recipientNewBalance,
      creatorShare,
      platformFee,
    });
  } catch (err: any) {
    void logSecurityEvent({ ...meta, event_type: 'GIFT_ERROR', severity: 'ERROR', result: 'failure', details: err?.message ?? 'Unhandled error' });
    return NextResponse.json({ error: err?.message || 'Gift failed.' }, { status: 500 });
  }
}
