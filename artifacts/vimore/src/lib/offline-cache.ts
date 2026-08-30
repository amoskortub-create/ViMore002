const CACHE_MAX_AGE_MS = 5 * 60 * 60 * 1000; // 5 hours

const KEYS = {
  USER:        'vm_offline_user',
  POSTS:       'vm_offline_posts',
  CONNECTIONS: 'vm_offline_connections',
  SONGS:       'vm_offline_songs',
  ALBUMS:      'vm_offline_albums',
};

interface TimestampedEntry<T> {
  data: T;
  savedAt: number;
}

function save(key: string, data: unknown) {
  try {
    const entry: TimestampedEntry<unknown> = { data, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch { }
}

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    const parsed = JSON.parse(v);
    if (parsed && typeof parsed === 'object' && 'savedAt' in parsed && 'data' in parsed) {
      const entry = parsed as TimestampedEntry<T>;
      if (Date.now() - entry.savedAt > CACHE_MAX_AGE_MS) {
        localStorage.removeItem(key);
        return fallback;
      }
      return entry.data;
    }
    return parsed as T;
  } catch { return fallback; }
}

export const offlineCache = {
  saveUser:        (user: unknown)        => save(KEYS.USER, user),
  getUser:         ()                     => load<unknown | null>(KEYS.USER, null),
  clearUser:       ()                     => { try { localStorage.removeItem(KEYS.USER); } catch { } },

  savePosts:       (posts: unknown[])     => save(KEYS.POSTS, posts),
  getPosts:        ()                     => load<unknown[]>(KEYS.POSTS, []),

  saveConnections: (conns: unknown[])     => save(KEYS.CONNECTIONS, conns),
  getConnections:  ()                     => load<unknown[]>(KEYS.CONNECTIONS, []),

  saveSongs:       (songs: unknown[])     => save(KEYS.SONGS, songs),
  getSongs:        ()                     => load<unknown[]>(KEYS.SONGS, []),

  saveAlbums:      (albums: unknown[])    => save(KEYS.ALBUMS, albums),
  getAlbums:       ()                     => load<unknown[]>(KEYS.ALBUMS, []),
};

// ─── Extended cache helpers ────────────────────────────────────────────────────

export const OFFLINE_KEYS = {
  // Feeds
  REELS:                'vimore_reels_cache_v1',
  HOME_FEED:            'vimore_feed_cache_v1',
  MUSIC_PLAYED:         'vimore_music_played_v1',

  // Conversations
  MESSAGES_CONTACTS:    'vimore_messages_contacts_v1',
  MESSAGES_CHAT:        'vimore_messages_chat_v1',        // per-chat messages, keyed by chatId

  // Friends
  FRIENDS:              'vimore_friends_cache_v1',
  FRIENDS_DISCOVERY:    'vimore_friends_discovery_v1',
  FRIENDS_CONFIRM:      'vimore_friends_confirm_v1',
  FRIENDS_PENDING:      'vimore_friends_pending_v1',

  // Pages / hubs
  PROFILE:              'vimore_profile_cache_v1',
  CURRENCY_DATA:        'vimore_currency_data_v1',
  EARNINGS_DATA:        'vimore_earnings_data_v1',
  MARKETPLACE_STORES:   'vimore_marketplace_stores_v1',
  STORE_DATA:           'vimore_store_data_v1',
  MTL_DATA:             'vimore_mtl_data_v1',
  TICKETS:              'vimore_tickets_cache_v1',
};

/** Save up to maxItems items to localStorage with a timestamp. */
export function saveCache<T>(key: string, items: T[], maxItems = 15): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: TimestampedEntry<T[]> = { data: items.slice(0, maxItems), savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {}
}

/** Load items saved with saveCache. Returns [] on any failure or expiry. */
export function loadCache<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'savedAt' in parsed && 'data' in parsed) {
      const entry = parsed as TimestampedEntry<T[]>;
      if (Date.now() - entry.savedAt > CACHE_MAX_AGE_MS) {
        localStorage.removeItem(key);
        return [];
      }
      return Array.isArray(entry.data) ? entry.data : [];
    }
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Save a single object (not an array) to localStorage with a timestamp.
 * Use for page-level data like profile, currency rates, earnings summary, etc.
 */
export function saveKeyValue<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: TimestampedEntry<T> = { data: value, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {}
}

/**
 * Load a single object saved with saveKeyValue. Returns null if missing or expired.
 */
export function loadKeyValue<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'savedAt' in parsed && 'data' in parsed) {
      const entry = parsed as TimestampedEntry<T>;
      if (Date.now() - entry.savedAt > CACHE_MAX_AGE_MS) {
        localStorage.removeItem(key);
        return null;
      }
      return entry.data;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Save messages for a specific chat conversation.
 * Key is scoped per chatId so different conversations don't overwrite each other.
 */
export function saveChatMessages<T>(chatId: string, messages: T[], maxItems = 50): void {
  if (typeof window === 'undefined' || !chatId) return;
  saveCache<T>(`${OFFLINE_KEYS.MESSAGES_CHAT}_${chatId}`, messages, maxItems);
}

/**
 * Load cached messages for a specific chat conversation.
 */
export function loadChatMessages<T>(chatId: string): T[] {
  if (typeof window === 'undefined' || !chatId) return [];
  return loadCache<T>(`${OFFLINE_KEYS.MESSAGES_CHAT}_${chatId}`);
}

// ─── Offline message outbox ───────────────────────────────────────────────────
// Messages the user tried to send while offline are queued here and retried on reconnect.

const OUTBOX_KEY = 'vimore_message_outbox_v1';

export interface OutboxMessage {
  id: string;           // client-generated UUID
  recipientId: string;
  clusterId?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  queuedAt: number;
  retries: number;
}

export function getOutboxMessages(): OutboxMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OutboxMessage[];
  } catch { return []; }
}

export function enqueueOutboxMessage(msg: Omit<OutboxMessage, 'id' | 'queuedAt' | 'retries'>): OutboxMessage {
  const entry: OutboxMessage = {
    ...msg,
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    queuedAt: Date.now(),
    retries: 0,
  };
  try {
    const current = getOutboxMessages();
    current.push(entry);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(current.slice(-100)));
  } catch {}
  return entry;
}

export function removeOutboxMessage(id: string): void {
  try {
    const current = getOutboxMessages().filter(m => m.id !== id);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(current));
  } catch {}
}

export function incrementOutboxRetry(id: string): void {
  try {
    const current = getOutboxMessages().map(m =>
      m.id === id ? { ...m, retries: m.retries + 1 } : m
    );
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(current));
  } catch {}
}

/**
 * Clears every known offline/feed cache from localStorage AND tells the
 * service worker to delete all its caches too.
 */
export function clearAllLocalCaches(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(); return; }

    const allKeys = [
      ...Object.values(KEYS),
      ...Object.values(OFFLINE_KEYS),
      OUTBOX_KEY,
      'vimore_marketplace_dir_v1',
      'vimore_product_grid_v1',
      'vimore_search_history',
      'vimore_drafts',
    ];
    for (const k of allKeys) {
      try { localStorage.removeItem(k); } catch {}
    }

    try {
      indexedDB.deleteDatabase('vimore-db-cache');
    } catch {}

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(reg => {
          if (reg.active) {
            const channel = new MessageChannel();
            channel.port1.onmessage = () => resolve();
            reg.active.postMessage({ type: 'CLEAR_ALL_CACHE' }, [channel.port2]);
            setTimeout(resolve, 2000);
          } else {
            resolve();
          }
        })
        .catch(() => resolve());
    } else {
      resolve();
    }
  });
}

/**
 * Tell the service worker to pre-fetch and store these URLs in the
 * long-lived (24 h) pinned media cache for offline use.
 */
export function pinMediaInSW(urls: string[]): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const valid = urls.filter(u => Boolean(u) && (u.startsWith('http') || u.startsWith('/')));
  if (!valid.length) return;
  navigator.serviceWorker.ready
    .then(reg => { reg.active?.postMessage({ type: 'PIN_MEDIA', urls: valid }); })
    .catch(() => {});
}

/**
 * Ask the service worker to pre-cache the given routes for offline navigation.
 */
export function precacheRoutes(routes: string[]): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then(reg => { reg.active?.postMessage({ type: 'PRECACHE_ROUTES', routes }); })
    .catch(() => {});
}
