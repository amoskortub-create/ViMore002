import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';

const COLLECTION = 'ai_knowledge_bank';

export async function GET(req: NextRequest) {
  const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
  const rl = rateLimit(`knowledge-admin:${ip}`, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  const session = await getSessionUser(req);
  if (!session || session.role !== 'SUPER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!process.env.APPWRITE_API_KEY) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));

  try {
    const db = getAdminDatabases();
    const data = await db.listDocuments(DATABASE_ID, COLLECTION, []);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
  const rl = rateLimit(`knowledge-admin-del:${ip}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  const session = await getSessionUser(req);
  if (!session || session.role !== 'SUPER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!process.env.APPWRITE_API_KEY) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('id');

  if (!docId || typeof docId !== 'string' || docId.length > 64) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  try {
    const db = getAdminDatabases();
    await db.deleteDocument(DATABASE_ID, COLLECTION, docId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
