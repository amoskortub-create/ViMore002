import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { getAdminDatabases, getAdminUsers, DATABASE_ID } from '@/lib/appwrite-server';

const ENDPOINT = (
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1'
).replace(/\/$/, '');
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';

/**
 * Server-side password reset.
 * Verifies the security answer server-side, updates the password via the
 * admin Users API, then creates and returns a fresh session so the user is
 * immediately logged in without a round-trip.
 */
export async function POST(req: NextRequest) {
  try {
    const { vimoreId, securityAnswer, newPassword } = await req.json();

    if (!vimoreId || !securityAnswer || !newPassword) {
      return NextResponse.json({ error: 'vimoreId, securityAnswer and newPassword are required.' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const normalised = vimoreId.includes('@') ? vimoreId : `${vimoreId}@vimore.cfd`;
    const db = getAdminDatabases();

    // 1. Look up the user doc and verify security answer
    const result = await db.listDocuments(DATABASE_ID, 'users', [
      Query.equal('email', normalised),
      Query.limit(1),
    ]);
    if (!result.documents.length) {
      return NextResponse.json({ error: 'No account found with that ViMore ID.' }, { status: 404 });
    }
    const userDoc = result.documents[0];
    const storedAnswer = (userDoc.security_answer || '').toLowerCase().trim();
    if (storedAnswer !== securityAnswer.toLowerCase().trim()) {
      return NextResponse.json({ error: 'Security answer is incorrect.' }, { status: 401 });
    }

    // 2. Update password via admin Users API (no old-password needed)
    const users = getAdminUsers();
    await users.updatePassword(userDoc.$id, newPassword);

    // 3. Create a fresh session server-to-server and return it
    const sessionRes = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Response-Format': '1.0.0',
      },
      body: JSON.stringify({ email: normalised, password: newPassword }),
    });
    const sessionData = await sessionRes.json();

    if (!sessionRes.ok) {
      // Password updated but session creation failed — still a success
      return NextResponse.json({ success: true, sessionCreated: false });
    }

    return NextResponse.json({
      success: true,
      sessionCreated: true,
      sessionId: sessionData.$id,
      secret: sessionData.secret,
      userId: sessionData.userId,
      expire: sessionData.expire,
    });
  } catch (err: any) {
    console.error('[auth/reset-password]', err);
    return NextResponse.json({ error: 'Password reset failed. Please try again.' }, { status: 500 });
  }
}
