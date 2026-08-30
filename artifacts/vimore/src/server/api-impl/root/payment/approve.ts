import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { ID } from 'node-appwrite';

export const maxDuration = 30;

const ALLOWED_ROLES = new Set(['SUPER', 'MODERATOR']);
const COL = {
  PAYMENT_REQUESTS: 'payment_requests',
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  NOTIFICATIONS: 'notifications',
};

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rl = rateLimit(`payment:approve:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Identity comes from the verified session — never from the body
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(session.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    const { requestId } = await req.json();
    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    const db = getAdminDatabases();

    // Read payment request from the server — never trust client-sent amounts
    let reqDoc: any;
    try {
      reqDoc = await db.getDocument(DATABASE_ID, COL.PAYMENT_REQUESTS, requestId);
    } catch {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    if (reqDoc.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot approve a request with status: ${reqDoc.status}` },
        { status: 409 }
      );
    }

    const userId: string = reqDoc.user_id;
    const coinAmount: number = Number(reqDoc.coin_amount ?? 0);
    const coinType: string = reqDoc.coin_type ?? 'Gold';

    if (!userId || coinAmount <= 0) {
      return NextResponse.json({ error: 'Invalid payment request data' }, { status: 400 });
    }

    // Read current balance server-side
    let userDoc: any;
    try {
      userDoc = await db.getDocument(DATABASE_ID, COL.USERS, userId);
    } catch {
      return NextResponse.json({ error: 'Recipient user not found' }, { status: 404 });
    }

    const balanceField =
      coinType === 'Diamond' ? 'diamond_balance' :
      coinType === 'Star'    ? 'star_balance'    : 'gold_balance';
    const currentBalance: number = Number(userDoc[balanceField] ?? 0);
    const newBalance = parseFloat((currentBalance + coinAmount).toFixed(8));

    // Mark approved first so double-approval is caught by the status check above.
    // Keep this update limited to the fields used by the payment workflow; old
    // payment_requests schemas may not have the optional audit timestamps.
    await db.updateDocument(DATABASE_ID, COL.PAYMENT_REQUESTS, requestId, {
      status: 'APPROVED',
    });

    // Credit balance
    await db.updateDocument(DATABASE_ID, COL.USERS, userId, {
      [balanceField]: newBalance,
    });

    // These records are useful but must not turn a successful approval into a
    // false "Action Failed" if an older Appwrite schema is missing an optional
    // attribute. The request status and balance are the authoritative action.
    const warnings: string[] = [];
    try {
      await db.createDocument(DATABASE_ID, COL.TRANSACTIONS, ID.unique(), {
        user_id: userId,
        type: 'CURRENCY_PURCHASE',
        currency: coinType.toUpperCase(),
        amount: coinAmount,
        description: `Currency purchase approved — ${reqDoc.package_name || reqDoc.message || ''}`,
        reference_id: requestId,
        status: 'COMPLETED',
      });
    } catch (err: any) {
      console.error('[payment/approve] transaction record failed:', err?.message || err);
      warnings.push('transaction record was not created');
    }

    try {
      await db.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
        user_id: userId,
        from_user_id: session.userId,
        type: 'SYSTEM',
        title: 'Payment Approved',
        content: `Your purchase of ${reqDoc.package_name || reqDoc.message || 'currency'} has been approved. Your balance has been updated.`,
        message: `Your purchase of ${reqDoc.package_name || reqDoc.message || 'currency'} has been approved. Your balance has been updated.`,
        is_read: false,
      });
    } catch (err: any) {
      console.error('[payment/approve] notification failed:', err?.message || err);
      warnings.push('notification was not created');
    }

    return NextResponse.json({ ok: true, newBalance, coinAmount, coinType, warnings });
  } catch (err: any) {
    console.error('[payment/approve] failed:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Approval failed' }, { status: 500 });
  }
}
