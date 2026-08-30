import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';
import { ID, Query } from 'node-appwrite';
import { logSecurityEvent, extractRequestMeta } from '@/lib/security-logger';

export const maxDuration = 30;

const ALLOWED_ROLES = new Set(['SUPER', 'MODERATOR']);
const COL = {
  USERS: 'users',
  POSTS: 'posts',
  USER_BANS: 'user_bans',
};

export async function POST(req: NextRequest) {
  const meta = extractRequestMeta(req);
  try {
    const ip = meta.ip_address;
    const rl = rateLimit(`admin:ban:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      void logSecurityEvent({ ...meta, event_type: 'RATE_LIMITED', severity: 'WARN', result: 'blocked', details: 'Admin ban rate limit exceeded' });
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Caller identity from session — body carries only the target
    const session = await getSessionUser(req);
    if (!session) {
      void logSecurityEvent({ ...meta, event_type: 'ADMIN_AUTH_FAILURE', severity: 'WARN', result: 'blocked', details: 'Unauthenticated admin ban attempt' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(session.role ?? '')) {
      void logSecurityEvent({ ...meta, event_type: 'ADMIN_FORBIDDEN', severity: 'CRITICAL', actor_id: session.userId, actor_role: session.role ?? 'none', result: 'blocked', details: 'Insufficient role for ban action' });
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    const { userId, reason, note } = await req.json();
    if (!userId || !reason) {
      return NextResponse.json({ error: 'userId and reason are required' }, { status: 400 });
    }

    // Prevent self-ban
    if (userId === session.userId) {
      void logSecurityEvent({ ...meta, event_type: 'ADMIN_SELF_BAN', severity: 'WARN', actor_id: session.userId, actor_role: session.role ?? '', result: 'blocked', details: 'Admin attempted to ban themselves' });
      return NextResponse.json({ error: 'Cannot ban yourself' }, { status: 400 });
    }

    const db = getAdminDatabases();

    // Verify target exists
    let targetDoc: any;
    try {
      targetDoc = await db.getDocument(DATABASE_ID, COL.USERS, userId);
    } catch {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // A MODERATOR cannot ban a SUPER admin
    if (session.role === 'MODERATOR' && targetDoc.role === 'SUPER') {
      void logSecurityEvent({ ...meta, event_type: 'ADMIN_PRIVILEGE_ESCALATION', severity: 'CRITICAL', actor_id: session.userId, actor_role: session.role, target_id: userId, result: 'blocked', details: 'Moderator attempted to ban a Super admin' });
      return NextResponse.json({ error: 'Moderators cannot ban Super admins' }, { status: 403 });
    }

    // Get admin username for audit trail
    let adminDoc: any;
    try {
      adminDoc = await db.getDocument(DATABASE_ID, COL.USERS, session.userId);
    } catch { /* continue */ }

    await db.updateDocument(DATABASE_ID, COL.USERS, userId, {
      status: 'banned',
      ban_reason: String(reason),
      ban_note: String(note || ''),
      banned_at: new Date().toISOString(),
      banned_by: adminDoc?.username || session.userId,
    });

    // Delete user's posts
    try {
      const postsRes = await db.listDocuments(DATABASE_ID, COL.POSTS, [
        Query.equal('user_id', userId),
        Query.limit(500),
      ]);
      await Promise.allSettled(
        postsRes.documents.map((doc) =>
          db.deleteDocument(DATABASE_ID, COL.POSTS, doc.$id)
        )
      );
    } catch { /* non-fatal */ }

    // Audit log in user_bans
    await db.createDocument(DATABASE_ID, COL.USER_BANS, ID.unique(), {
      user_id: userId,
      reason: String(reason),
      banned_by: session.userId,
      is_permanent: true,
    });

    void logSecurityEvent({ ...meta, event_type: 'ADMIN_BAN', severity: 'WARN', actor_id: session.userId, actor_role: session.role ?? '', target_id: userId, result: 'success', details: `Reason: ${reason}. Note: ${note || 'none'}. Banned by: ${adminDoc?.username || session.userId}` });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    void logSecurityEvent({ ...meta, event_type: 'ADMIN_BAN_ERROR', severity: 'ERROR', result: 'failure', details: err?.message ?? 'Unhandled error' });
    return NextResponse.json({ error: err?.message || 'Ban failed' }, { status: 500 });
  }
}
