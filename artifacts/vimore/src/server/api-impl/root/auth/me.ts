import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, getAdminUsers, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';

/**
 * GET /api/auth/me
 *
 * Verifies the caller's Appwrite session (via X-Appwrite-Session or
 * Authorization: Bearer JWT headers sent by authFetch) and returns
 * the authUser shape + profile document needed by checkSession in
 * PostContext. Using the admin SDK means this works regardless of
 * whether the Replit domain is registered as an Appwrite platform.
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = sessionUser;

    const [adminUser, profileDoc] = await Promise.all([
      getAdminUsers().get(userId),
      getAdminDatabases().getDocument(DATABASE_ID, 'users', userId),
    ]);

    // Return only the fields mapDocToUser reads from authUser
    const authUser = {
      $id: adminUser.$id,
      email: adminUser.email,
      name: adminUser.name,
      emailVerification: adminUser.emailVerification,
      $createdAt: adminUser.$createdAt,
    };

    return NextResponse.json({ authUser, profileDoc });
  } catch (err: any) {
    console.error('[/api/auth/me]', err);
    const code = err?.code ?? err?.status;
    if (code === 401 || err?.type === 'general_unauthorized_scope') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Session check failed' }, { status: 500 });
  }
}
