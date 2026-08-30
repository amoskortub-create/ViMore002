import 'server-only';
import { NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';

const COL_USERS = 'users';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    const normalized = phone.trim().replace(/[\s\-().]/g, '');
    const db = getAdminDatabases();
    const result = await db.listDocuments(DATABASE_ID, COL_USERS, [
      Query.equal('phone', normalized),
      Query.limit(1),
    ]);

    if (!result.documents.length) {
      return NextResponse.json({ error: 'No account found with that phone number.' }, { status: 404 });
    }

    // Return only the email (used as vimoreId internally) — no sensitive data
    return NextResponse.json({ email: result.documents[0].email });
  } catch (err: any) {
    console.error('[lookup-phone]', err);
    return NextResponse.json({ error: 'Phone lookup failed.' }, { status: 500 });
  }
}
