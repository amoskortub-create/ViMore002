import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query, ID } from 'node-appwrite';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'vimoreprod';
const COL_ID = 'user_activity';

function getAdminClient() {
  return new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { user_id, username } = body;
    if (!user_id || !username) {
      return NextResponse.json({ error: 'Missing user_id or username' }, { status: 400 });
    }

    const ip_address = getClientIp(req);
    const user_agent = (req.headers.get('user-agent') || '').slice(0, 512);
    const session_date = getTodayDate();
    const last_seen = new Date().toISOString();

    const db = new Databases(getAdminClient());

    // Try to find existing record for this user+day
    const existing = await db.listDocuments(DATABASE_ID, COL_ID, [
      Query.equal('user_id', user_id),
      Query.equal('session_date', session_date),
      Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
      // Update last_seen and IP
      await db.updateDocument(DATABASE_ID, COL_ID, existing.documents[0].$id, {
        last_seen,
        ip_address,
        user_agent,
      });
    } else {
      // Create new daily record
      await db.createDocument(DATABASE_ID, COL_ID, ID.unique(), {
        user_id,
        username,
        ip_address,
        user_agent,
        session_date,
        last_seen,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Activity] Error:', err?.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
