import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { ID, Query } from 'node-appwrite';

export const maxDuration = 20;

const USERS = 'users';
const FOLLOWS = 'follows';
const FRIEND_REQUESTS = 'friend_requests';
const NOTIFICATIONS = 'notifications';

type FriendAction = 'send' | 'confirm' | 'cancel' | 'unfriend';

/**
 * Admin-backed friend-request actions.
 *
 * Why this route exists:
 * The friend flow needs to write to `friend_requests` / `follows` AND update
 * the *other* user's `users` document (followers_count / following_count).
 * A normal logged-in user has no document-level permission to mutate another
 * user's row, so doing this directly from the browser throws Appwrite's
 * "The current user is not authorized to perform the requested action" (401).
 *
 * The identity is ALWAYS derived from the session — never trusted from the body.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rl = rateLimit(`friends-action:${ip}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as FriendAction;
    const targetUsername = typeof body?.targetUsername === 'string' ? body.targetUsername.trim() : '';

    if (!action || !['send', 'confirm', 'cancel', 'unfriend'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }
    if (!targetUsername) {
      return NextResponse.json({ error: 'targetUsername is required.' }, { status: 400 });
    }

    const db = getAdminDatabases();
    const meId = session.userId;

    // Resolve identities from the DB.
    const [meRes, targetRes] = await Promise.all([
      db.getDocument(DATABASE_ID, USERS, meId).catch(() => null as any),
      db.listDocuments(DATABASE_ID, USERS, [Query.equal('username', targetUsername), Query.limit(1)]),
    ]);
    const me: any = meRes;
    const target: any = targetRes.documents[0];
    if (!me) return NextResponse.json({ error: 'Session user not found.' }, { status: 404 });
    if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (target.$id === meId) {
      return NextResponse.json({ error: 'Cannot perform this action on yourself.' }, { status: 400 });
    }

    const num = (v: any) => (typeof v === 'number' && v >= 0 ? v : 0);

    // ── helpers ──────────────────────────────────────────────────────────────
    const followExists = async (followerId: string, followingId: string) => {
      const r = await db.listDocuments(DATABASE_ID, FOLLOWS, [
        Query.equal('follower_id', followerId),
        Query.equal('following_id', followingId),
        Query.limit(1),
      ]);
      return r.documents.length > 0;
    };

    const createFollow = async (
      follower: any,
      following: any,
    ) => {
      if (await followExists(follower.$id, following.$id)) return false;
      await db.createDocument(DATABASE_ID, FOLLOWS, ID.unique(), {
        follower_id: follower.$id,
        following_id: following.$id,
        follower_username: follower.username,
        following_username: following.username,
      });
      await db.updateDocument(DATABASE_ID, USERS, follower.$id, {
        following_count: num(follower.following_count) + 1,
      }).catch(() => {});
      await db.updateDocument(DATABASE_ID, USERS, following.$id, {
        followers_count: num(following.followers_count) + 1,
      }).catch(() => {});
      return true;
    };

    const deleteFollow = async (follower: any, following: any) => {
      const r = await db.listDocuments(DATABASE_ID, FOLLOWS, [
        Query.equal('follower_id', follower.$id),
        Query.equal('following_id', following.$id),
      ]);
      if (r.documents.length === 0) return false;
      for (const doc of r.documents) {
        await db.deleteDocument(DATABASE_ID, FOLLOWS, doc.$id).catch(() => {});
      }
      await db.updateDocument(DATABASE_ID, USERS, follower.$id, {
        following_count: Math.max(0, num(follower.following_count) - 1),
      }).catch(() => {});
      await db.updateDocument(DATABASE_ID, USERS, following.$id, {
        followers_count: Math.max(0, num(following.followers_count) - 1),
      }).catch(() => {});
      return true;
    };

    const notify = async (payload: Record<string, any>) => {
      await db.createDocument(DATABASE_ID, NOTIFICATIONS, ID.unique(), payload).catch(() => {});
    };

    const meName = me.name || me.username;

    // ── actions ────────────────────────────────────────────────────────────
    if (action === 'send') {
      // Avoid duplicate pending requests.
      const existing = await db.listDocuments(DATABASE_ID, FRIEND_REQUESTS, [
        Query.equal('from_user_id', meId),
        Query.equal('to_user_id', target.$id),
        Query.equal('status', 'PENDING'),
        Query.limit(1),
      ]);
      if (existing.documents.length === 0) {
        await db.createDocument(DATABASE_ID, FRIEND_REQUESTS, ID.unique(), {
          from_user_id: meId,
          to_user_id: target.$id,
          status: 'PENDING',
        });
      }

      await createFollow(me, target);

      await notify({
        user_id: target.$id,
        from_user_id: meId,
        from_user_name: meName,
        from_user_avatar: me.avatar || '',
        type: 'FRIEND_REQUEST',
        title: 'Friend Request',
        content: `${meName} (@${me.username}) sent you a friend request.`,
        message: `${meName} (@${me.username}) sent you a friend request.`,
        is_read: false,
      });

      return NextResponse.json({ ok: true });
    }

    if (action === 'confirm') {
      // Accept any pending requests from target → me.
      const pending = await db.listDocuments(DATABASE_ID, FRIEND_REQUESTS, [
        Query.equal('from_user_id', target.$id),
        Query.equal('to_user_id', meId),
        Query.equal('status', 'PENDING'),
      ]);
      for (const doc of pending.documents) {
        await db.updateDocument(DATABASE_ID, FRIEND_REQUESTS, doc.$id, { status: 'ACCEPTED' }).catch(() => {});
      }

      // Ensure mutual follows exist.
      await createFollow(me, target);
      await createFollow(target, me);

      await notify({
        user_id: target.$id,
        from_user_id: meId,
        from_user_name: meName,
        from_user_avatar: me.avatar || '',
        type: 'FRIEND_ACCEPT',
        title: 'Friend Request Accepted',
        content: `${meName} (@${me.username}) accepted your friend request.`,
        message: `${meName} (@${me.username}) accepted your friend request.`,
        is_read: false,
      });

      return NextResponse.json({ ok: true });
    }

    if (action === 'cancel') {
      const pending = await db.listDocuments(DATABASE_ID, FRIEND_REQUESTS, [
        Query.equal('from_user_id', meId),
        Query.equal('to_user_id', target.$id),
        Query.equal('status', 'PENDING'),
      ]);
      for (const doc of pending.documents) {
        await db.deleteDocument(DATABASE_ID, FRIEND_REQUESTS, doc.$id).catch(() => {});
      }
      await deleteFollow(me, target);
      return NextResponse.json({ ok: true });
    }

    // action === 'unfriend'
    const [sent, recv] = await Promise.all([
      db.listDocuments(DATABASE_ID, FRIEND_REQUESTS, [
        Query.equal('from_user_id', meId),
        Query.equal('to_user_id', target.$id),
        Query.equal('status', 'ACCEPTED'),
      ]),
      db.listDocuments(DATABASE_ID, FRIEND_REQUESTS, [
        Query.equal('from_user_id', target.$id),
        Query.equal('to_user_id', meId),
        Query.equal('status', 'ACCEPTED'),
      ]),
    ]);
    for (const doc of [...sent.documents, ...recv.documents]) {
      await db.deleteDocument(DATABASE_ID, FRIEND_REQUESTS, doc.$id).catch(() => {});
    }
    await deleteFollow(me, target);
    await deleteFollow(target, me);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[friends/action] error:', err?.message ?? err);
    return NextResponse.json({ error: err?.message || 'Bad request' }, { status: 400 });
  }
}
