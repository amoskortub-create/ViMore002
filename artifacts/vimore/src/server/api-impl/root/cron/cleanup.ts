import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';

const COL = {
  POSTS: 'posts',
  TRACKS: 'tracks',
  USERS: 'users',
  AD_CAMPAIGNS: 'ad_campaigns',
};

const BATCH = 100;
const ADMIN_ROLES = new Set(['SUPER', 'MODERATOR']);

async function resetExpiredBoostedDocs(
  db: ReturnType<typeof getAdminDatabases>,
  collectionId: string,
  resetFields: Record<string, any>
) {
  let fixed = 0;
  const now = Date.now();
  let cursor: string | undefined;
  do {
    const queries: string[] = [Query.equal('is_boosted', true), Query.limit(BATCH)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await db.listDocuments(DATABASE_ID, collectionId, queries);
    for (const doc of page.documents) {
      const expiry = doc.boost_expiry ? Number(doc.boost_expiry) : null;
      if (expiry !== null && expiry <= now) {
        await db.updateDocument(DATABASE_ID, collectionId, doc.$id, resetFields);
        fixed++;
      }
    }
    cursor = page.documents.length === BATCH ? page.documents[page.documents.length - 1].$id : undefined;
  } while (cursor);
  return fixed;
}

async function resetExpiredVerifications(db: ReturnType<typeof getAdminDatabases>) {
  let fixed = 0;
  const now = Date.now();
  let cursor: string | undefined;
  do {
    const queries: string[] = [Query.equal('is_verified', true), Query.limit(BATCH)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await db.listDocuments(DATABASE_ID, COL.USERS, queries);
    for (const doc of page.documents) {
      const expiry = doc.verification_expiry ? Number(doc.verification_expiry) : null;
      if (expiry !== null && expiry <= now) {
        await db.updateDocument(DATABASE_ID, COL.USERS, doc.$id, { is_verified: false });
        fixed++;
      }
    }
    cursor = page.documents.length === BATCH ? page.documents[page.documents.length - 1].$id : undefined;
  } while (cursor);
  return fixed;
}

async function deactivateExpiredCampaigns(db: ReturnType<typeof getAdminDatabases>) {
  let fixed = 0;
  const now = new Date().toISOString();
  let cursor: string | undefined;
  do {
    const queries: string[] = [Query.equal('is_active', true), Query.limit(BATCH)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await db.listDocuments(DATABASE_ID, COL.AD_CAMPAIGNS, queries);
    for (const doc of page.documents) {
      const expiryStr = doc.expires_at || doc.end_date || null;
      if (expiryStr && expiryStr <= now) {
        await db.updateDocument(DATABASE_ID, COL.AD_CAMPAIGNS, doc.$id, {
          is_active: false,
          status: 'PAUSED',
        });
        fixed++;
      }
    }
    cursor = page.documents.length === BATCH ? page.documents[page.documents.length - 1].$id : undefined;
  } while (cursor);
  return fixed;
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || !ADMIN_ROLES.has(session.role ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDatabases();
    const [postBoosts, trackBoosts, verifications, campaigns] = await Promise.all([
      resetExpiredBoostedDocs(db, COL.POSTS, { is_boosted: false, boost_expiry: null }),
      resetExpiredBoostedDocs(db, COL.TRACKS, { is_boosted: false, boost_expiry: null }),
      resetExpiredVerifications(db),
      deactivateExpiredCampaigns(db),
    ]);

    const summary = { postBoosts, trackBoosts, verifications, campaigns };
    if (postBoosts + trackBoosts + verifications + campaigns > 0) {
      console.log(`[Cleanup] Expired items reset:`, summary);
    }

    return NextResponse.json({ ok: true, reset: summary });
  } catch (err: any) {
    console.error('[Cleanup] Error:', err?.message);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
