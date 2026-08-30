import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 20;

// Strict allow-list: ONLY these fields may be set by a user on their own profile.
// Any field not in this list (is_verified, role, gold_balance, etc.) is silently dropped.
const ALLOWED_PROFILE_FIELDS = new Set([
  'name',
  'bio',
  'category',
  'nationality',
  'date_of_birth',
  'gender',
  'language',
  'phone',
  'avatar_id',
  'cover_id',
  'website',
  'subscription_price',
  'free_post_limit',
  'post_price',
  'discord',
  'twitter',
  'instagram',
  'tiktok',
  'youtube',
]);

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rl = rateLimit(`profile:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    }

    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    // Mass-assignment protection: only copy allowed fields
    const safeUpdate: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_PROFILE_FIELDS.has(key)) {
        // Basic type guards
        if (typeof value === 'string') {
          safeUpdate[key] = String(value).slice(0, 2000);
        } else if (typeof value === 'number') {
          safeUpdate[key] = Number(value);
        } else if (typeof value === 'boolean') {
          // booleans not in allowed list, but just in case
          safeUpdate[key] = Boolean(value);
        }
      }
      // Silently drop anything not in the allow-list
    }

    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
    }

    // Validate subscription_price if provided (must be a reasonable number)
    if ('subscription_price' in safeUpdate) {
      const price = Number(safeUpdate.subscription_price);
      if (!Number.isFinite(price) || price < 0 || price > 10_000) {
        return NextResponse.json(
          { error: 'subscription_price must be between 0 and 10,000.' },
          { status: 400 }
        );
      }
    }

    const db = getAdminDatabases();
    await db.updateDocument(DATABASE_ID, 'users', session.userId, safeUpdate as any);

    return NextResponse.json({ ok: true, updated: Object.keys(safeUpdate) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Profile update failed.' }, { status: 500 });
  }
}
