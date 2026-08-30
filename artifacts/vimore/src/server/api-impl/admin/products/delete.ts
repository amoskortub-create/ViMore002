import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, getAdminStorage, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';

export const maxDuration = 30;

const PRODUCTS_COLLECTION = 'Products';
const MARKETPLACE_BUCKET = 'Marketplace_Images';
const ALLOWED_ROLES = new Set(['SUPER', 'MODERATOR']);

export async function POST(req: NextRequest) {
  try {
    const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
    const rl = rateLimit(`admin:delete:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(session.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const db = getAdminDatabases();

    let product: any = null;
    try {
      product = await db.getDocument(DATABASE_ID, PRODUCTS_COLLECTION, productId);
    } catch { /* already gone */ }

    if (product) {
      const storage = getAdminStorage();
      const fileIds: string[] = Array.isArray(product.imageFileIds)
        ? product.imageFileIds
        : [];
      for (const fileId of fileIds) {
        try { await storage.deleteFile(MARKETPLACE_BUCKET, fileId); } catch { /* ignore */ }
      }
      try {
        await db.deleteDocument(DATABASE_ID, PRODUCTS_COLLECTION, productId);
      } catch { /* already gone */ }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad request' }, { status: 400 });
  }
}
