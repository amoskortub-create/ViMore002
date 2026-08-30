import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { Query } from 'node-appwrite';

export const maxDuration = 20;

const ALLOWED_ROLES = new Set(['SUPER', 'MODERATOR']);
const COL = {
  VERIFICATION_RECORDS: 'verification_records',
  USERS: 'users',
};

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(session.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDatabases();

    const records = await db.listDocuments(DATABASE_ID, COL.VERIFICATION_RECORDS, [
      Query.equal('status', 'PENDING'),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]);

    // Enrich with user info
    const enriched = await Promise.all(
      records.documents.map(async (rec: any) => {
        try {
          const user = await db.getDocument(DATABASE_ID, COL.USERS, rec.user_id);
          return {
            ...rec,
            user: {
              username: user.username,
              display_name: user.display_name || user.name,
              avatar: user.profile_picture || user.avatar || null,
              follower_count: user.follower_count || 0,
            },
          };
        } catch {
          return { ...rec, user: null };
        }
      })
    );

    return NextResponse.json({ records: enriched, total: records.total });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch verifications' }, { status: 500 });
  }
}
