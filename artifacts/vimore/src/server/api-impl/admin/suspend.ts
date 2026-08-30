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
  NOTIFICATIONS: 'notifications',
};

export async function POST(req: NextRequest) {
  const meta = extractRequestMeta(req);
  try {
    const ip = meta.ip_address;
    const rl = rateLimit(`admin:suspend:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      void logSecurityEvent({ ...meta, event_type: 'RATE_LIMITED', severity: 'WARN', result: 'blocked', details: 'Admin suspend rate limit exceeded' });
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      void logSecurityEvent({ ...meta, event_type: 'ADMIN_AUTH_FAILURE', severity: 'WARN', result: 'blocked', details: 'Unauthenticated admin suspend attempt' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(session.role ?? '')) {
      void logSecurityEvent({ ...meta, event_type: 'ADMIN_FORBIDDEN', severity: 'CRITICAL', actor_id: session.userId, actor_role: session.role ?? 'none', result: 'blocked', details: 'Insufficient role for suspend action' });
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    const { userId, days, reason, message } = await req.json();
    if (!userId || !days || !reason) {
      return NextResponse.json({ error: 'userId, days and reason are required' }, { status: 400 });
    }

    const parsedDays = Number(days);
    if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 365) {
      return NextResponse.json({ error: 'days must be an integer between 1 and 365' }, { status: 400 });
    }

    if (userId === session.userId) {
      void logSecurityEvent({ ...meta, event_type: 'ADMIN_SELF_SUSPEND', severity: 'WARN', actor_id: session.userId, actor_role: session.role ?? '', result: 'blocked', details: 'Admin attempted to suspend themselves' });
      return NextResponse.json({ error: 'Cannot suspend yourself' }, { status: 400 });
    }

    const db = getAdminDatabases();

    let targetDoc: any;
    try {
      targetDoc = await db.getDocument(DATABASE_ID, COL.USERS, userId);
    } catch {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    if (session.role === 'MODERATOR' && targetDoc.role === 'SUPER') {
      void logSecurityEvent({ ...meta, event_type: 'ADMIN_PRIVILEGE_ESCALATION', severity: 'CRITICAL', actor_id: session.userId, actor_role: session.role, target_id: userId, result: 'blocked', details: 'Moderator attempted to suspend a Super admin' });
      return NextResponse.json({ error: 'Moderators cannot suspend Super admins' }, { status: 403 });
    }

    let adminDoc: any;
    try {
      adminDoc = await db.getDocument(DATABASE_ID, COL.USERS, session.userId);
    } catch { /* continue */ }

    const suspendedUntil = new Date(Date.now() + parsedDays * 86_400_000).toISOString();

    await db.updateDocument(DATABASE_ID, COL.USERS, userId, {
      status: 'suspended',
      suspended_until: suspendedUntil,
      suspension_reason: String(reason),
      suspension_message: String(message || ''),
      suspended_by: adminDoc?.username || session.userId,
    });

    if (message) {
      await db.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
        user_id: userId,
        from_user_id: session.userId,
        type: 'SYSTEM',
        title: 'Account Suspended',
        message: String(message),
        content: String(message),
        is_read: false,
      });
    }

    void logSecurityEvent({ ...meta, event_type: 'ADMIN_SUSPEND', severity: 'WARN', actor_id: session.userId, actor_role: session.role ?? '', target_id: userId, result: 'success', details: `${parsedDays} day(s). Reason: ${reason}. Until: ${suspendedUntil}` });

    return NextResponse.json({ ok: true, suspendedUntil });
  } catch (err: any) {
    void logSecurityEvent({ ...meta, event_type: 'ADMIN_SUSPEND_ERROR', severity: 'ERROR', result: 'failure', details: err?.message ?? 'Unhandled error' });
    return NextResponse.json({ error: err?.message || 'Suspension failed' }, { status: 500 });
  }
}
