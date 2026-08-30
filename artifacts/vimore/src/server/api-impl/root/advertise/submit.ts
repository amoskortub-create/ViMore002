import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';
import { ID } from 'node-appwrite';

export const maxDuration = 30;

const USERS_COL = 'users';
const CAMPAIGNS_COL = 'ad_campaigns';
const CREDITS_PER_DAY = 3;
const MIN_DAYS = 5;
const MAX_DAYS = 90;

export async function POST(req: NextRequest) {
  try {
    /* ── Rate limit: 10 campaign submissions per hour per IP ── */
    const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
    const rl = rateLimit(`advertise:${ip}`, 10, 60 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please wait before submitting again.' }, { status: 429 });
    }

    /* ── Verify session — identity comes from the cookie, not the body ── */
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in to create a campaign.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      businessName,
      details,
      actionUrl,
      actionLabel,
      placement,
      days,
      mediaUrl,
      mediaId,
      contactType,
    } = body;

    if (!businessName || !details || !actionUrl || !actionLabel || !placement || !days || !mediaUrl || !mediaId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const parsedDays = Number(days);
    if (!Number.isInteger(parsedDays) || parsedDays < MIN_DAYS || parsedDays > MAX_DAYS) {
      return NextResponse.json({ error: `Campaign duration must be between ${MIN_DAYS} and ${MAX_DAYS} days.` }, { status: 400 });
    }

    if (!['feed', 'reel'].includes(placement)) {
      return NextResponse.json({ error: 'Placement must be feed or reel.' }, { status: 400 });
    }

    const db = getAdminDatabases();
    const totalCost = parsedDays * CREDITS_PER_DAY;

    /* ── Server-side balance read using the verified session userId ── */
    let userDoc: any;
    try {
      userDoc = await db.getDocument(DATABASE_ID, USERS_COL, session.userId);
    } catch {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const realBalance: number = userDoc.credit_balance ?? userDoc.diamond_balance ?? 0;

    if (realBalance < totalCost) {
      return NextResponse.json({
        error: 'INSUFFICIENT_BALANCE',
        message: `Insufficient Credits. This campaign costs ${totalCost} Credits (${parsedDays} days × ${CREDITS_PER_DAY} Credits/day). Your actual balance is ${realBalance} Credits. You are short by ${totalCost - realBalance} Credits.`,
        needed: totalCost,
        current: realBalance,
        shortfall: totalCost - realBalance,
      }, { status: 402 });
    }

    const newBalance = realBalance - totalCost;
    await db.updateDocument(DATABASE_ID, USERS_COL, session.userId, {
      credit_balance: newBalance,
      diamond_balance: newBalance,
    });

    const expires = new Date();
    expires.setDate(expires.getDate() + parsedDays);

    let campaignDoc: any;
    try {
      campaignDoc = await db.createDocument(DATABASE_ID, CAMPAIGNS_COL, ID.unique(), {
        user_id: session.userId,
        title: String(businessName).trim(),
        content: String(details).trim(),
        media_url: String(mediaUrl),
        media_id: String(mediaId),
        placement: String(placement),
        type: 'video',
        status: 'ACTIVE',
        is_active: true,
        impressions: 0,
        clicks: 0,
        action_url: String(actionUrl),
        action_label: String(actionLabel).trim(),
        budget: totalCost,
        spent: totalCost,
        expires_at: expires.toISOString(),
        contact_type: String(contactType || 'url'),
        days_purchased: parsedDays,
        credits_spent: totalCost,
      });
    } catch (campaignErr: any) {
      try {
        await db.updateDocument(DATABASE_ID, USERS_COL, session.userId, { credit_balance: realBalance, diamond_balance: realBalance });
      } catch { /* best-effort refund */ }
      return NextResponse.json({ error: `Campaign creation failed: ${campaignErr?.message || 'unknown error'}. Your Credits have been refunded.` }, { status: 500 });
    }

    const textToScan = [businessName, details].filter(Boolean).join(' ').trim();
    if (textToScan || mediaUrl) {
      fetch(`${req.nextUrl.origin}/api/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: campaignDoc.$id,
          collection: CAMPAIGNS_COL,
          text: textToScan,
          userId: session.userId,
          mediaUrl: mediaUrl || undefined,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, campaign: campaignDoc, newBalance, totalCost });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error.' }, { status: 500 });
  }
}
