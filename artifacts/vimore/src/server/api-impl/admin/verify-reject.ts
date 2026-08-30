import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';
import { ID } from 'node-appwrite';
import { logSecurityEvent, extractRequestMeta } from '@/lib/security-logger';

export const maxDuration = 30;

const ALLOWED_ROLES = new Set(['SUPER', 'MODERATOR']);
const COL = {
  USERS: 'users',
  VERIFICATION_RECORDS: 'verification_records',
  NOTIFICATIONS: 'notifications',
};

export async function POST(req: NextRequest) {
  const meta = extractRequestMeta(req);
  try {
    const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
    const rl = rateLimit(`verify-reject:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      void logSecurityEvent({ ...meta, event_type: 'ADMIN_AUTH_FAILURE', severity: 'WARN', result: 'blocked', details: 'Unauthenticated verify-reject attempt' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(session.role ?? '')) {
      void logSecurityEvent({ ...meta, event_type: 'ADMIN_FORBIDDEN', severity: 'CRITICAL', actor_id: session.userId, actor_role: session.role ?? 'none', result: 'blocked', details: 'Insufficient role for verification rejection' });
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    const { recordId, reason } = await req.json();
    if (!recordId) {
      return NextResponse.json({ error: 'recordId is required' }, { status: 400 });
    }

    const db = getAdminDatabases();

    let recordDoc: any;
    try {
      recordDoc = await db.getDocument(DATABASE_ID, COL.VERIFICATION_RECORDS, recordId);
    } catch {
      return NextResponse.json({ error: 'Verification record not found' }, { status: 404 });
    }

    if (recordDoc.status !== 'PENDING') {
      return NextResponse.json({ error: `Cannot reject a record with status: ${recordDoc.status}` }, { status: 409 });
    }

    const userId: string = recordDoc.user_id;
    const currency: string = recordDoc.currency ?? 'DIAMOND';
    const amount: number = Number(recordDoc.amount ?? 0);

    await db.updateDocument(DATABASE_ID, COL.VERIFICATION_RECORDS, recordId, {
      status: 'REJECTED',
      rejected_by: session.userId,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason || 'Does not meet verification requirements',
    });

    // Refund the fee if amount was recorded
    if (amount > 0) {
      const balanceField = currency === 'STAR' ? 'star_balance' : 'diamond_balance';
      try {
        const userDoc = await db.getDocument(DATABASE_ID, COL.USERS, userId);
        const currentBalance = Math.round(Number(userDoc[balanceField] ?? 0));
        await db.updateDocument(DATABASE_ID, COL.USERS, userId, {
          [balanceField]: currentBalance + Math.round(amount),
        });
      } catch { /* best-effort refund */ }
    }

    try {
      await db.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
        user_id: userId,
        from_user_id: session.userId,
        type: 'SYSTEM',
        title: 'Verification Not Approved',
        content: `Your verification request was not approved. Reason: ${reason || 'Does not meet verification requirements'}. Your fee has been refunded.`,
        message: `Your verification request was not approved. Reason: ${reason || 'Does not meet verification requirements'}. Your fee has been refunded.`,
        is_read: false,
      });
    } catch { /* non-fatal */ }

    void logSecurityEvent({ ...meta, event_type: 'ADMIN_VERIFY_REJECT', severity: 'INFO', actor_id: session.userId, actor_role: session.role ?? '', target_id: userId, result: 'success', details: `Verification record ${recordId} rejected. Reason: ${reason || 'Does not meet requirements'}. Fee refunded: ${amount} ${currency}` });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    void logSecurityEvent({ ...meta, event_type: 'ADMIN_VERIFY_REJECT_ERROR', severity: 'ERROR', result: 'failure', details: err?.message ?? 'Unhandled error' });
    return NextResponse.json({ error: err?.message || 'Rejection failed' }, { status: 500 });
  }
}
