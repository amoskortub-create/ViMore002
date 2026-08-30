import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 20;

const COL = { USERS: 'users', POSTS: 'posts' };
const MIN_LOCK_PRICE = 100;
const MAX_LOCK_PRICE = 500;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rl = rateLimit(`lock-post:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    }

    const { postId, unlockPrice } = await req.json();
    if (!postId) {
      return NextResponse.json({ error: 'postId is required.' }, { status: 400 });
    }

    const rawPrice = Number(unlockPrice);
    const price = Math.round(rawPrice);
    if (!Number.isFinite(rawPrice) || price < MIN_LOCK_PRICE || price > MAX_LOCK_PRICE) {
      return NextResponse.json(
        { error: `Unlock price must be between ${MIN_LOCK_PRICE} and ${MAX_LOCK_PRICE} LD.` },
        { status: 400 }
      );
    }

    const db = getAdminDatabases();

    let postDoc: any;
    try {
      postDoc = await db.getDocument(DATABASE_ID, COL.POSTS, postId);
    } catch {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    if (postDoc.user_id !== session.userId) {
      return NextResponse.json({ error: 'You can only lock your own posts.' }, { status: 403 });
    }

    const creator = await db.getDocument(DATABASE_ID, COL.USERS, session.userId);
    const followerCount = Number(creator.followers_count ?? creator.followers ?? 0);
    if (followerCount < 1000) {
      return NextResponse.json({ error: `You need 1,000 followers to lock content. You currently have ${followerCount} followers.` }, { status: 403 });
    }

    await db.updateDocument(DATABASE_ID, COL.POSTS, postId, {
      is_locked: true,
      unlock_price: price,
    });

    return NextResponse.json({ ok: true, postId, unlockPrice: price });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to lock post.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rl = rateLimit(`unlock-post:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    }

    const { postId } = await req.json();
    if (!postId) {
      return NextResponse.json({ error: 'postId is required.' }, { status: 400 });
    }

    const db = getAdminDatabases();

    let postDoc: any;
    try {
      postDoc = await db.getDocument(DATABASE_ID, COL.POSTS, postId);
    } catch {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    if (postDoc.user_id !== session.userId) {
      return NextResponse.json({ error: 'You can only unlock your own posts.' }, { status: 403 });
    }

    await db.updateDocument(DATABASE_ID, COL.POSTS, postId, {
      is_locked: false,
      unlock_price: null,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to unlock post.' }, { status: 500 });
  }
}
