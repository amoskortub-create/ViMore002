/**
 * ViMore Service Worker v12
 * - APP_SHELL_CACHE: permanent — Next.js static assets (JS/CSS/fonts)
 * - PAGE_CACHE: 5 h — full page HTML for offline navigation
 * - PINNED_CACHE: 24 h — audio/video intentionally played by the user
 * - MEDIA_CACHE: 5 h — all other images / media encountered while browsing
 * - Range-request synthesis: cached full videos are sliced to satisfy byte-range requests
 * - Push notifications and badge control unchanged
 */

const SW_VERSION = 'v1788731199264';
const APP_SHELL_CACHE = `vimore-shell-${SW_VERSION}`;
const PAGE_CACHE      = `vimore-pages-${SW_VERSION}`;
const MEDIA_CACHE     = `vimore-media-${SW_VERSION}`;
const PINNED_CACHE    = `vimore-pinned-${SW_VERSION}`;
const CACHE_NAMES     = [APP_SHELL_CACHE, PAGE_CACHE, MEDIA_CACHE, PINNED_CACHE];

const MAX_PAGE_AGE_MS   = 5  * 60 * 60 * 1000;  // 5 h
const MAX_MEDIA_AGE_MS  = 5  * 60 * 60 * 1000;  // 5 h
const MAX_PINNED_AGE_MS = 24 * 60 * 60 * 1000;  // 24 h

// Pages/routes to pre-cache on install for guaranteed offline access
const PRECACHE_ROUTES = [
  '/',
  '/reels',
  '/marketplace',
  '/messages',
  '/music',
  '/notifications',
  '/menu',
  '/settings',
  '/search',
  '/profile',
  '/currency',
  '/earnings',
  '/store',
  '/friends',
  '/tickets',
  '/mtl',
  '/how-it-works',
  '/explore',
];

const MEDIA_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg',
  '.mp4', '.webm', '.ogv',
  '.mp3', '.ogg', '.wav', '.aac', '.m4a', '.flac', '.opus',
];

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv'];

const APPWRITE_FILE_PATTERNS = ['/v1/storage/buckets/', '/files/'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isMediaUrl(url) {
  try {
    const parsed = new URL(url);
    const lower  = parsed.pathname.toLowerCase().split('?')[0];
    const host   = parsed.hostname;
    if (MEDIA_EXTENSIONS.some(ext => lower.endsWith(ext))) return true;
    if (APPWRITE_FILE_PATTERNS.some(p => lower.includes(p)))  return true;
    if (host === 'picsum.photos') return true;
    if (host.includes('appwrite.io') || host.includes('appwrite.cloud')) return true;
    return false;
  } catch { return false; }
}

function isVideoUrl(url) {
  try {
    const lower = new URL(url).pathname.toLowerCase().split('?')[0];
    if (VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext))) return true;
    // Appwrite storage URLs that serve video files
    if (APPWRITE_FILE_PATTERNS.some(p => lower.includes(p))) return true;
    return false;
  } catch { return false; }
}

function isStaticAsset(url) {
  try {
    const { pathname } = new URL(url);
    return pathname.startsWith('/_next/static/') || pathname.startsWith('/icons/') || pathname === '/manifest.json';
  } catch { return false; }
}

function isPageNavigation(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

function stampResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', String(Date.now()));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isExpired(cachedResponse, maxAge) {
  const at = cachedResponse.headers.get('sw-cached-at');
  if (!at) return true;
  return (Date.now() - Number(at)) > maxAge;
}

async function purgeExpired(cacheName, maxAge) {
  try {
    const cache = await caches.open(cacheName);
    const keys  = await cache.keys();
    await Promise.all(
      keys.map(async req => {
        const res = await cache.match(req);
        if (res && isExpired(res, maxAge)) await cache.delete(req);
      })
    );
  } catch {}
}

/**
 * Synthesise an HTTP 206 Partial Content response from a fully cached response.
 * Returns null if the range header is missing, malformed, or the cache is empty.
 */
async function synthesizeRangeResponse(cachedResponse, rangeHeader) {
  if (!cachedResponse || !rangeHeader) return null;
  try {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (!match) return null;

    const buffer = await cachedResponse.clone().arrayBuffer();
    const total  = buffer.byteLength;
    if (total === 0) return null;

    const start = match[1] !== '' ? parseInt(match[1], 10) : 0;
    const end   = match[2] !== '' ? parseInt(match[2], 10) : total - 1;

    if (start > end || start >= total) return null;

    const safeEnd = Math.min(end, total - 1);
    const chunk   = buffer.slice(start, safeEnd + 1);

    return new Response(chunk, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type':   cachedResponse.headers.get('Content-Type') || 'video/mp4',
        'Content-Range':  `bytes ${start}-${safeEnd}/${total}`,
        'Content-Length': String(safeEnd - start + 1),
        'Accept-Ranges':  'bytes',
      },
    });
  } catch { return null; }
}

// ─── Install — pre-cache the app shell and key routes ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      try {
        const pageCache = await caches.open(PAGE_CACHE);
        await Promise.all(
          PRECACHE_ROUTES.map(async route => {
            try {
              const response = await fetch(route, { credentials: 'include' });
              if (response.ok) {
                await pageCache.put(route, stampResponse(response));
              }
            } catch {}
          })
        );
      } catch {}
      await self.skipWaiting();
    })()
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(keys.filter(k => !CACHE_NAMES.includes(k)).map(k => caches.delete(k)))
      )
      .then(() => Promise.all([
        purgeExpired(PAGE_CACHE,   MAX_PAGE_AGE_MS),
        purgeExpired(MEDIA_CACHE,  MAX_MEDIA_AGE_MS),
        purgeExpired(PINNED_CACHE, MAX_PINNED_AGE_MS),
      ]))
      .then(() => self.clients.claim())
      .then(async () => {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: SW_VERSION }));
      })
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // ── 1. Static assets: network-first, cache fallback ──────────────────────
  // A cache-first strategy can keep an old Next bundle alive after an import
  // or dev restart. Prefer the current asset whenever the app is online.
  if (isStaticAsset(request.url)) {
    event.respondWith(
      (async () => {
        const shellCache = await caches.open(APP_SHELL_CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) {
            await shellCache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await shellCache.match(request);
          return cached || new Response('Asset unavailable offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // ── 2. Page navigations: stale-while-revalidate with 5 h expiry ──────────
  if (isPageNavigation(request)) {
    event.respondWith(
      (async () => {
        const pageCache = await caches.open(PAGE_CACHE);
        const cached = await pageCache.match(request);

        const networkFetch = fetch(request)
          .then(response => {
            if (response.ok) {
              pageCache.put(request, stampResponse(response.clone()));
            }
            return response;
          })
          .catch(() => null);

        if (cached && !isExpired(cached, MAX_PAGE_AGE_MS)) {
          return cached;
        }

        try {
          const fresh = await networkFetch;
          if (fresh) return fresh;
        } catch {}

        if (cached) return cached;

        const rootCached = await pageCache.match('/');
        if (rootCached) return rootCached;

        return new Response(
          '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ViMore — Offline</title><style>*{box-sizing:border-box;margin:0}body{background:#050505;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;text-align:center;padding:24px}.icon{font-size:64px}.title{font-size:24px;font-weight:900;letter-spacing:-.05em;font-style:italic;text-transform:uppercase}.sub{font-size:14px;color:rgba(255,255,255,.5);max-width:280px;line-height:1.6}</style></head><body><div class="icon">📡</div><div class="title">No Connection</div><div class="sub">ViMore could not load this page. Check your connection and try again, or go back to a page you visited earlier.</div><br><button onclick="history.back()" style="background:#7c3aed;color:#fff;border:none;padding:12px 24px;border-radius:12px;font-weight:700;cursor:pointer;font-size:13px">Go Back</button></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })()
    );
    return;
  }

  // ── 3. Media: cache-first with range-request synthesis for videos ─────────
  if (!isMediaUrl(request.url)) return;

  event.respondWith(
    (async () => {
      const rangeHeader  = request.headers.get('Range');
      const isRangeReq   = Boolean(rangeHeader);
      const isVideo      = isVideoUrl(request.url);

      const pinnedCache = await caches.open(PINNED_CACHE);
      const mediaCache  = await caches.open(MEDIA_CACHE);

      // For range requests on video URLs: try to synthesize from cached full file
      if (isRangeReq && isVideo) {
        // Look up the bare URL (no Range header) in pinned cache
        const pinnedFull = await pinnedCache.match(request.url);
        if (pinnedFull && !isExpired(pinnedFull, MAX_PINNED_AGE_MS)) {
          const synthesized = await synthesizeRangeResponse(pinnedFull, rangeHeader);
          if (synthesized) return synthesized;
        }

        // Also check regular media cache for a cached full response
        const mediaFull = await mediaCache.match(request.url);
        if (mediaFull && !isExpired(mediaFull, MAX_MEDIA_AGE_MS)) {
          const synthesized = await synthesizeRangeResponse(mediaFull, rangeHeader);
          if (synthesized) return synthesized;
        }

        // Nothing cached — pass the range request to network as-is
        try {
          return await fetch(request);
        } catch {
          // Offline with no cache: return stale if available
          const stale = pinnedFull || mediaFull;
          if (stale) {
            const synthesized = await synthesizeRangeResponse(stale, rangeHeader);
            if (synthesized) return synthesized;
          }
          return new Response('Video unavailable offline', { status: 503 });
        }
      }

      // Non-range requests: standard cache-first
      const pinned = await pinnedCache.match(request);
      if (pinned && !isExpired(pinned, MAX_PINNED_AGE_MS)) return pinned;
      if (pinned) pinnedCache.delete(request);

      const cached = await mediaCache.match(request);
      if (cached && !isExpired(cached, MAX_MEDIA_AGE_MS)) return cached;
      if (cached) mediaCache.delete(request);

      try {
        const response = await fetch(request);
        // Cache complete responses (200) — including full video fetches from PIN_MEDIA
        if (response.ok && response.status === 200) {
          mediaCache.put(request, stampResponse(response.clone()));
        }
        return response;
      } catch {
        const stalePinned = await pinnedCache.match(request);
        if (stalePinned) return stalePinned;
        const staleMedia = await mediaCache.match(request);
        if (staleMedia) return staleMedia;
        return new Response('Media unavailable offline', { status: 503 });
      }
    })()
  );
});

// ─── Messages ─────────────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  const data = event.data || {};

  // Pin media URLs into the 24 h pinned cache as complete (non-range) responses
  if (data.type === 'PIN_MEDIA' && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(PINNED_CACHE).then(async cache => {
        for (const url of data.urls) {
          try {
            const existing = await cache.match(url);
            if (existing && !isExpired(existing, MAX_PINNED_AGE_MS)) continue;
            // Fetch without Range header so we get the complete file (status 200)
            const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
            if (response.ok && response.status === 200) {
              await cache.put(url, stampResponse(response));
            }
          } catch {}
        }
      })
    );
  }

  // Pre-cache specific page routes on demand
  if (data.type === 'PRECACHE_ROUTES' && Array.isArray(data.routes)) {
    event.waitUntil(
      caches.open(PAGE_CACHE).then(async cache => {
        for (const route of data.routes) {
          try {
            const existing = await cache.match(route);
            if (existing && !isExpired(existing, MAX_PAGE_AGE_MS)) continue;
            const response = await fetch(route, { credentials: 'include' });
            if (response.ok) await cache.put(route, stampResponse(response));
          } catch {}
        }
      })
    );
  }

  if (data.type === 'CLEAR_MEDIA_CACHE') {
    Promise.all([caches.delete(MEDIA_CACHE), caches.delete(PINNED_CACHE)]).then(() => {
      event.source?.postMessage({ type: 'MEDIA_CACHE_CLEARED' });
    });
  }

  if (data.type === 'CLEAR_ALL_CACHE') {
    Promise.all(CACHE_NAMES.map(n => caches.delete(n))).then(() => {
      event.source?.postMessage({ type: 'ALL_CACHE_CLEARED' });
    });
  }

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data.type === 'SET_BADGE') {
    const count = Number(data.count) || 0;
    try {
      if (count > 0 && self.navigator.setAppBadge)  self.navigator.setAppBadge(count).catch(() => {});
      else if (self.navigator.clearAppBadge)         self.navigator.clearAppBadge().catch(() => {});
    } catch {}
  }
  if (data.type === 'CLEAR_BADGE') {
    try { if (self.navigator.clearAppBadge) self.navigator.clearAppBadge().catch(() => {}); } catch {}
  }
});

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'ViMore', body: event.data ? event.data.text() : '' };
  }

  const isCallPush = payload.data && payload.data.type === 'incoming-call';
  const title = payload.title || 'ViMore';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    image: payload.image,
    tag: payload.tag || 'vimore-notification',
    renotify: Boolean(payload.renotify),
    requireInteraction: isCallPush ? true : Boolean(payload.requireInteraction),
    silent: Boolean(payload.silent),
    vibrate: isCallPush ? [300, 100, 300, 100, 300] : (payload.vibrate || [120, 60, 120]),
    timestamp: payload.timestamp || Date.now(),
    data: { url: payload.url || '/notifications', ...payload.data },
    actions: isCallPush
      ? [{ action: 'accept-call', title: '✅ Accept' }, { action: 'decline-call', title: '❌ Decline' }]
      : (payload.actions || []),
  };

  event.waitUntil(
    (async () => {
      try { await self.registration.showNotification(title, options); } catch {}
      try {
        if (self.navigator.setAppBadge) {
          const count = Number(payload.badgeCount);
          if (count > 0) await self.navigator.setAppBadge(count);
          else await self.navigator.setAppBadge();
        }
      } catch {}
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(c => c.postMessage({ type: 'PUSH_RECEIVED', payload }));
    })()
  );
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  const action = event.action;
  const data = event.notification.data || {};
  const targetUrl = data.url || '/';
  event.notification.close();

  if (action === 'accept-call') {
    event.waitUntil((async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        try {
          const cu = new URL(client.url);
          if (cu.origin === self.location.origin && 'focus' in client) {
            client.postMessage({ type: 'CALL_ACTION', action: 'accept', callDocId: data.callDocId, callType: data.callType, callerName: data.callerName, callerAvatar: data.callerAvatar });
            await client.focus(); return;
          }
        } catch {}
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(`/messages?call_action=accept&call_doc_id=${encodeURIComponent(data.callDocId || '')}&call_type=${encodeURIComponent(data.callType || 'audio')}&caller_name=${encodeURIComponent(data.callerName || '')}`);
      }
    })());
    return;
  }

  if (action === 'decline-call') {
    event.waitUntil((async () => {
      if (data.callDocId) {
        try { await fetch('/api/call/decline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callDocId: data.callDocId }), keepalive: true }); } catch {}
      }
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(c => c.postMessage({ type: 'CALL_ACTION', action: 'decline', callDocId: data.callDocId }));
    })());
    return;
  }

  if (action === 'reply') {
    const replyText = (event.reply || '').trim();
    event.waitUntil((async () => {
      if (replyText && data.recipientId && data.senderId && data.clusterId) {
        try {
          await fetch('/api/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senderId: data.recipientId, receiverId: data.senderId, clusterId: data.clusterId, text: replyText }), keepalive: true });
          await fetch('/api/messages/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientId: data.recipientId, senderId: data.senderId, clusterId: data.clusterId }), keepalive: true });
        } catch {}
      }
      try { if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge(); } catch {}
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(c => c.postMessage({ type: 'QUICK_REPLY_SENT', clusterId: data.clusterId, senderId: data.senderId, text: replyText }));
    })());
    return;
  }

  if (action === 'mark-read') {
    event.waitUntil((async () => {
      try { await fetch('/api/messages/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientId: data.recipientId, senderId: data.senderId, clusterId: data.clusterId }), keepalive: true }); } catch {}
      try { if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge(); } catch {}
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(c => c.postMessage({ type: 'MESSAGES_MARKED_READ', senderId: data.senderId, clusterId: data.clusterId }));
    })());
    return;
  }

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      try {
        const cu = new URL(client.url);
        if (cu.origin === self.location.origin && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          await client.focus();
          if ('navigate' in client) try { await client.navigate(targetUrl); } catch {}
          return;
        }
      } catch {}
    }
    if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
  })());
});

// ─── Push subscription changed ────────────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(c => c.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' }));
    })
  );
});
