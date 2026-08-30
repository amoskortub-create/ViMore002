import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { rateLimit } from '@/lib/rate-limit';
import { Query } from 'node-appwrite';

export const maxDuration = 30;

const SUBS_COLLECTION = 'push_subscriptions';
const MAX_TARGETS = 100;

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BGRfT6eaMS4SJwWAA4ZM-IR32_qDO1xAoyq3N5LqF6kLgPXLdBrC1WExJEt0daf091gcfZhlSezLv4FqWCFikk0';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:amoskortub@gmail.com';

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidConfigured = true;
  } catch (err) {
    console.warn('[push/send] VAPID setup failed:', (err as any)?.message || err);
  }
}

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  badgeCount?: number;
  data?: Record<string, any>;
  actions?: { action: string; title: string; icon?: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    const rl = rateLimit(`push-send:${ip}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const body = await req.json();
    const { userId, userIds, payload } = body as {
      userId?: string;
      userIds?: string[];
      payload: PushPayload;
    };

    const rawTargets = (userIds && userIds.length ? userIds : userId ? [userId] : []).filter(Boolean);
    if (!rawTargets.length || !payload) {
      return NextResponse.json({ error: 'userId(s) and payload required' }, { status: 400 });
    }

    const targets = rawTargets
      .filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9._-]{1,64}$/.test(id))
      .slice(0, MAX_TARGETS);

    if (!targets.length) {
      return NextResponse.json({ error: 'No valid user IDs provided.' }, { status: 400 });
    }

    if (payload.title && String(payload.title).length > 200) {
      payload.title = String(payload.title).slice(0, 200);
    }
    if (payload.body && String(payload.body).length > 500) {
      payload.body = String(payload.body).slice(0, 500);
    }
    if (payload.url && typeof payload.url === 'string') {
      try {
        const u = new URL(payload.url, 'https://placeholder.local');
        if (!['/', '/notifications', '/messages', '/reels', '/music', '/marketplace', '/events'].some(p => u.pathname.startsWith(p))) {
          payload.url = '/notifications';
        }
      } catch {
        payload.url = '/notifications';
      }
    }

    ensureVapid();

    const db = getAdminDatabases();

    const subs: Array<{ $id: string; endpoint: string; p256dh: string; auth: string }> = [];
    for (const uid of targets) {
      try {
        const res = await db.listDocuments(DATABASE_ID, SUBS_COLLECTION, [
          Query.equal('user_id', uid),
          Query.limit(10),
        ]);
        res.documents.forEach((d: any) => subs.push({
          $id: d.$id,
          endpoint: d.endpoint,
          p256dh: d.p256dh,
          auth: d.auth,
        }));
      } catch (err: any) {
        console.warn('[push/send] sub lookup failed for', uid, err?.message || err);
      }
    }

    if (!subs.length) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no_subscriptions' });
    }

    const json = JSON.stringify({
      title: payload.title || 'ViMore',
      body: payload.body || '',
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      image: payload.image,
      url: payload.url || '/notifications',
      tag: payload.tag,
      renotify: payload.renotify,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent,
      badgeCount: payload.badgeCount,
      data: payload.data || {},
      actions: payload.actions || [],
      timestamp: Date.now(),
    });

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            json,
          );
          sent++;
        } catch (err: any) {
          failed++;
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            try { await db.deleteDocument(DATABASE_ID, SUBS_COLLECTION, s.$id); } catch {}
          } else {
            console.warn('[push/send] delivery failed:', status, err?.body || err?.message);
          }
        }
      })
    );

    return NextResponse.json({ ok: true, sent, failed, total: subs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad request' }, { status: 400 });
  }
}
