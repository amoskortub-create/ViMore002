import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { ID } from 'node-appwrite';
import { CREDIT_PRICES } from '@/lib/credit-pricing';

export const maxDuration = 30;

const COL = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  VERIFICATION_RECORDS: 'verification_records',
};

const VERIFY_PRICES: Record<string, number> = {
  DIAMOND: CREDIT_PRICES.verification,
  STAR: 25000,
};

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rl = rateLimit(`verify:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    }

    const { currency } = await req.json();
    if (!currency) {
      return NextResponse.json({ error: 'currency is required.' }, { status: 400 });
    }

    const normalizedCurrency = String(currency).toUpperCase();
    if (!['DIAMOND', 'STAR'].includes(normalizedCurrency)) {
      return NextResponse.json({ error: 'currency must be CREDIT or STAR.' }, { status: 400 });
    }

    const parsedCost = VERIFY_PRICES[normalizedCurrency];
    if (!parsedCost) {
      return NextResponse.json(
        { error: 'Unsupported verification currency.' },
        { status: 400 }
      );
    }

    const db = getAdminDatabases();

    let userDoc: any;
    try {
      userDoc = await db.getDocument(DATABASE_ID, COL.USERS, session.userId);
    } catch {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (userDoc.is_verified === true) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const balanceField = normalizedCurrency === 'DIAMOND' ? 'diamond_balance' : 'star_balance';
    const currentBalance: number = Math.round(Number(userDoc[balanceField] ?? 0));

    if (currentBalance < parsedCost) {
      return NextResponse.json(
        { error: `Insufficient balance. You need ${parsedCost} ${normalizedCurrency} but have ${currentBalance}.` },
        { status: 400 }
      );
    }

    const newBalance = currentBalance - parsedCost;
    const verificationExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const verificationRecordId = ID.unique();
    const transactionId = ID.unique();

    await db.updateDocument(DATABASE_ID, COL.USERS, session.userId, {
      [balanceField]: newBalance,
      ...(normalizedCurrency === 'DIAMOND'
        ? { credit_balance: newBalance, diamond_balance: newBalance }
        : {}),
      is_verified: true,
      has_ever_been_verified: true,
      verification_expiry: verificationExpiry,
    });

    try {
      await Promise.all([
        db.createDocument(DATABASE_ID, COL.VERIFICATION_RECORDS, verificationRecordId, {
          user_id: session.userId,
          type: 'CREATOR',
          status: 'APPROVED',
          currency: normalizedCurrency,
          amount: parsedCost,
          submitted_at: new Date().toISOString(),
          reviewed_by: 'SYSTEM',
          approved_by: 'SYSTEM',
          approved_at: new Date().toISOString(),
        } as any),
        db.createDocument(DATABASE_ID, COL.TRANSACTIONS, transactionId, {
          user_id: session.userId,
          transactionId,
          senderUserId: session.userId,
          receiverUserId: session.userId,
          transactionType: 'verification',
          amountLD: parsedCost,
          createdAt: new Date().toISOString(),
          type: 'VERIFICATION_FEE',
          currency: normalizedCurrency,
          amount: parsedCost,
          description: 'Creator verification fee',
          status: 'COMPLETED',
        } as any),
      ]);
    } catch {
      try {
        await db.updateDocument(DATABASE_ID, COL.USERS, session.userId, {
          [balanceField]: currentBalance,
          ...(normalizedCurrency === 'DIAMOND'
            ? { credit_balance: currentBalance, diamond_balance: currentBalance }
            : {}),
          is_verified: userDoc.is_verified ?? false,
          has_ever_been_verified: userDoc.has_ever_been_verified ?? false,
          verification_expiry: userDoc.verification_expiry ?? null,
        });
      } catch { }
      throw new Error('Failed to create verification record.');
    }

    return NextResponse.json({
      ok: true,
      status: 'ACTIVE',
      newBalance,
      verificationExpiry,
      verificationRecordId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Verification failed.' }, { status: 500 });
  }
}
