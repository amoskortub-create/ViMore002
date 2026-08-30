import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { ID } from 'node-appwrite';

export const maxDuration = 30;

const COL_WITHDRAWALS = 'withdrawal_requests';
const COL_USERS = 'users';

const CURRENCY_CONFIG: Record<string, {
  dbField: string;
  minAmount: number;
}> = {
  DIAMOND: { dbField: 'diamond_balance', minAmount: 10 },
  GOLD:    { dbField: 'gold_balance',    minAmount: 100 },
  STAR:    { dbField: 'star_balance',    minAmount: 100 },
};

/* ─── Idempotency cache: userId:key → result, TTL 24 h ─────────────────── */
interface IdemEntry { result: object; expiresAt: number }
const idemStore = new Map<string, IdemEntry>();
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of idemStore) if (now > v.expiresAt) idemStore.delete(k);
  }, 60 * 60_000);
}

export async function POST(req: NextRequest) {
  try {
    /* ── 1. Rate limit: 5 withdrawal attempts per hour per IP ── */
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rl = rateLimit(`withdraw:${ip}`, 5, 60 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many withdrawal requests. Please wait before trying again.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    /* ── 2. Verify the caller's session — never trust body for identity ── */
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in to withdraw.' }, { status: 401 });
    }

    /* ── 3. Parse and validate inputs ── */
    const body = await req.json();
    const {
      currency,
      amount,
      method,
      accountName,
      accountNumber,
      payoutAmount,
      payoutCurrency,
      idempotencyKey,
    } = body;

    if (!currency || !amount || !method || !accountNumber) {
      return NextResponse.json(
        { error: 'currency, amount, method and accountNumber are required.' },
        { status: 400 }
      );
    }

    const config = CURRENCY_CONFIG[String(currency).toUpperCase()];
    if (!config) {
      return NextResponse.json({ error: 'Invalid currency type.' }, { status: 400 });
    }

    const withdrawAmount = parseFloat(amount);
    if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number.' }, { status: 400 });
    }
    if (withdrawAmount < config.minAmount) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${config.minAmount} ${currency}.` },
        { status: 400 }
      );
    }

    /* ── 4. Idempotency check ── */
    if (idempotencyKey) {
      const iKey = `${session.userId}:${idempotencyKey}`;
      const cached = idemStore.get(iKey);
      if (cached && Date.now() < cached.expiresAt) {
        return NextResponse.json(cached.result);
      }
    }

    /* ── 5. Server-side balance read — never trust client balance ── */
    const db = getAdminDatabases();
    let userDoc: any;
    try {
      userDoc = await db.getDocument(DATABASE_ID, COL_USERS, session.userId);
    } catch {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const currentBalance: number = Number(userDoc[config.dbField] ?? 0);
    if (currentBalance < withdrawAmount) {
      return NextResponse.json(
        {
          error: `Insufficient balance. You have ${currentBalance} ${currency} but requested ${withdrawAmount}.`,
        },
        { status: 400 }
      );
    }

    /* ── 6. Atomically deduct balance then create withdrawal record ── */
    const newBalance = parseFloat((currentBalance - withdrawAmount).toFixed(8));

    await db.updateDocument(DATABASE_ID, COL_USERS, session.userId, {
      [config.dbField]: newBalance,
    });

    let withdrawalId: string;
    try {
      const wd = await db.createDocument(
        DATABASE_ID,
        COL_WITHDRAWALS,
        ID.unique(),
        {
          user_id: session.userId,
          username: userDoc.username || '',
          account_name: accountName || '',
          account_number: String(accountNumber),
          currency: currency.toUpperCase(),
          amount: withdrawAmount,
          payout_amount: parseFloat(payoutAmount || 0),
          payout_currency: payoutCurrency || 'USD',
          method: method || 'MOBILE_MONEY',
          payment_method: method || 'MOBILE_MONEY',
          payment_details: String(accountNumber),
          status: 'PENDING',
        }
      );
      withdrawalId = wd.$id;
    } catch (err) {
      /* Rollback balance deduction if document creation fails */
      try {
        await db.updateDocument(DATABASE_ID, COL_USERS, session.userId, {
          [config.dbField]: currentBalance,
        });
      } catch { /* best-effort rollback */ }
      throw err;
    }

    const result = { ok: true, withdrawalId, newBalance };

    /* Cache result for idempotency */
    if (idempotencyKey) {
      const iKey = `${session.userId}:${idempotencyKey}`;
      idemStore.set(iKey, { result, expiresAt: Date.now() + 24 * 60 * 60_000 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Withdrawal failed. Please try again.' },
      { status: 500 }
    );
  }
}
