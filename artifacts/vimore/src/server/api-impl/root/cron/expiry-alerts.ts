import { NextRequest, NextResponse } from 'next/server';
import { Query, ID } from 'node-appwrite';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';

const COL = {
  POSTS: 'posts',
  TRACKS: 'tracks',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
};

const ALERT_TYPE = 'EXPIRY_ALERT';
const WINDOW_MS = 72 * 60 * 60 * 1000;
const DEDUP_HOURS = 20;
const ADMIN_ROLES = new Set(['SUPER', 'MODERATOR']);

async function alreadyAlerted(
  db: ReturnType<typeof getAdminDatabases>,
  userId: string,
  title: string
): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - DEDUP_HOURS * 60 * 60 * 1000).toISOString();
    const res = await db.listDocuments(DATABASE_ID, COL.NOTIFICATIONS, [
      Query.equal('user_id', userId),
      Query.equal('type', ALERT_TYPE),
      Query.equal('title', title),
      Query.greaterThan('$createdAt', cutoff),
      Query.limit(1),
    ]);
    return res.documents.length > 0;
  } catch {
    return false;
  }
}

async function sendNotification(
  db: ReturnType<typeof getAdminDatabases>,
  userId: string,
  title: string,
  content: string,
  actionHref: string
) {
  await db.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
    user_id: userId,
    type: ALERT_TYPE,
    title,
    content,
    message: content,
    is_read: false,
    from_user_id: 'system',
    from_user_name: 'ViMore',
    from_user_avatar: '',
    action_href: actionHref,
    action_label: 'Renew Now',
  });
}

function hoursLeft(expiry: number): number {
  return Math.max(0, Math.round((expiry - Date.now()) / 3600000));
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || !ADMIN_ROLES.has(session.role ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDatabases();
    const now = Date.now();
    const windowEnd = now + WINDOW_MS;
    let postAlerts = 0, trackAlerts = 0, userAlerts = 0;

    // Boosted posts expiring soon
    {
      let cursor: string | undefined;
      do {
        const queries: string[] = [Query.equal('is_boosted', true), Query.limit(100)];
        if (cursor) queries.push(Query.cursorAfter(cursor));
        const page = await db.listDocuments(DATABASE_ID, COL.POSTS, queries);
        for (const doc of page.documents) {
          const expiry = doc.boost_expiry ? Number(doc.boost_expiry) : null;
          if (!expiry || expiry <= now || expiry > windowEnd) continue;
          const ownerId = doc.user_id;
          if (!ownerId) continue;
          const hrs = hoursLeft(expiry);
          const title = '🚀 Post Boost Expiring Soon';
          const content = `Your boosted post expires in ${hrs} hour${hrs !== 1 ? 's' : ''}. Renew to keep your reach going!`;
          if (await alreadyAlerted(db, ownerId, title)) continue;
          await sendNotification(db, ownerId, title, content, '/dashboard');
          postAlerts++;
        }
        cursor = page.documents.length === 100 ? page.documents[page.documents.length - 1].$id : undefined;
      } while (cursor);
    }

    // Boosted tracks expiring soon
    {
      let cursor: string | undefined;
      do {
        const queries: string[] = [Query.equal('is_boosted', true), Query.limit(100)];
        if (cursor) queries.push(Query.cursorAfter(cursor));
        const page = await db.listDocuments(DATABASE_ID, COL.TRACKS, queries);
        for (const doc of page.documents) {
          const expiry = doc.boost_expiry ? Number(doc.boost_expiry) : null;
          if (!expiry || expiry <= now || expiry > windowEnd) continue;
          const ownerId = doc.user_id;
          if (!ownerId) continue;
          const hrs = hoursLeft(expiry);
          const title = '🎵 Track Boost Expiring Soon';
          const content = `Your boosted track "${doc.title || 'track'}" expires in ${hrs} hour${hrs !== 1 ? 's' : ''}. Renew to stay on the charts!`;
          if (await alreadyAlerted(db, ownerId, title)) continue;
          await sendNotification(db, ownerId, title, content, '/music');
          trackAlerts++;
        }
        cursor = page.documents.length === 100 ? page.documents[page.documents.length - 1].$id : undefined;
      } while (cursor);
    }

    // Verification badges expiring soon
    {
      let cursor: string | undefined;
      do {
        const queries: string[] = [Query.equal('is_verified', true), Query.limit(100)];
        if (cursor) queries.push(Query.cursorAfter(cursor));
        const page = await db.listDocuments(DATABASE_ID, COL.USERS, queries);
        for (const doc of page.documents) {
          const expiry = doc.verification_expiry ? Number(doc.verification_expiry) : null;
          if (!expiry || expiry <= now || expiry > windowEnd) continue;
          const hrs = hoursLeft(expiry);
          const title = '✅ Verification Badge Expiring Soon';
          const content = `Your verified badge expires in ${hrs} hour${hrs !== 1 ? 's' : ''}. Renew now to keep your checkmark!`;
          if (await alreadyAlerted(db, doc.$id, title)) continue;
          await sendNotification(db, doc.$id, title, content, '/verification');
          userAlerts++;
        }
        cursor = page.documents.length === 100 ? page.documents[page.documents.length - 1].$id : undefined;
      } while (cursor);
    }

    const sent = { posts: postAlerts, tracks: trackAlerts, users: userAlerts };
    if (postAlerts + trackAlerts + userAlerts > 0) {
      console.log('[ExpiryAlerts] Sent:', sent);
    }
    return NextResponse.json({ ok: true, sent });
  } catch (err: any) {
    console.error('[ExpiryAlerts] Error:', err?.message);
    return NextResponse.json({ error: 'Alert failed' }, { status: 500 });
  }
}
