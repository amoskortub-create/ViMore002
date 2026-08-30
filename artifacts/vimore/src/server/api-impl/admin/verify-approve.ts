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
  TRANSACTIONS: 'transactions',
};

export async function POST(req: NextRequest) {
  const meta = extractRequestMeta(req);
  try {
    const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
    const rl = rateLimit(`verify-approve:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      void logSecurityEvent({ ...meta, event_type: 'ADMIN_AUTH_FAILURE', severity: 'WARN', result: 'blocked', details: 'Unauthenticated verify-approve attempt' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(session.role ?? '')) {
      void logSecurityEvent({ ...meta, event_type: 'ADMIN_FORBIDDEN', severity: 'CRITICAL', actor_id: session.userId, actor_role: session.role ?? 'none', result: 'blocked', details: 'Insufficient role for verification approval' });
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    const { recordId } = await req.json();
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
      return NextResponse.json({ error: `Cannot approve a record with status: ${recordDoc.status}` }, { status: 409 });
    }

    const userId: string = recordDoc.user_id;

    await db.updateDocument(DATABASE_ID, COL.VERIFICATION_RECORDS, recordId, {
      status: 'APPROVED',
      approved_by: session.userId,
      approved_at: new Date().toISOString(),
    });

    await db.updateDocument(DATABASE_ID, COL.USERS, userId, {
      is_verified: true,
      has_ever_been_verified: true,
    });

    try {
      await db.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
        user_id: userId,
        from_user_id: session.userId,
        type: 'SYSTEM',
        title: 'Verification Approved ✅',
        content: 'Your creator verification has been approved by our team. You are now a verified creator on ViMore!',
        message: 'Your creator verification has been approved by our team. You are now a verified creator on ViMore!',
        is_read: false,
      });
    } catch { /* non-fatal */ }

    void logSecurityEvent({ ...meta, event_type: 'ADMIN_VERIFY_APPROVE', severity: 'INFO', actor_id: session.userId, actor_role: session.role ?? '', target_id: userId, result: 'success', details: `Verification record ${recordId} approved` });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    void logSecurityEvent({ ...meta, event_type: 'ADMIN_VERIFY_APPROVE_ERROR', severity: 'ERROR', result: 'failure', details: err?.message ?? 'Unhandled error' });
    return NextResponse.json({ error: err?.message || 'Approval failed' }, { status: 500 });
  }
}
