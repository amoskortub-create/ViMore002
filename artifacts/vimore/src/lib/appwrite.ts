import { Client, Account, Databases, Storage, ID, Query, Permission, Role } from 'appwrite';

export type { Models } from 'appwrite';

const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1').replace(/\/$/, '');
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'vimoreprod';

export const COL = {
  USERS: 'users',
  POSTS: 'posts',
  POST_COMMENTS: 'post_comments',
  POST_REACTIONS: 'post_reactions',
  POST_UNLOCKS: 'post_unlocks',
  BOOKMARKS: 'bookmarks',
  STORIES: 'stories',
  STORY_SEGMENTS: 'story_segments',
  STORY_VIEWS: 'story_views',
  FOLLOWS: 'follows',
  FRIEND_REQUESTS: 'friend_requests',
  BLOCKED_USERS: 'blocked_users',
  MESSAGES: 'messages',
  GROUP_MESSAGES: 'group_messages',
  CLUSTERS: 'clusters',
  CLUSTER_MEMBERS: 'cluster_members',
  TRACKS: 'tracks',
  TRACK_LIKES: 'track_likes',
  ALBUMS: 'albums',
  PLAYLISTS: 'playlists',
  PLAYLIST_TRACKS: 'playlist_tracks',
  NOTIFICATIONS: 'notifications',
  TRANSACTIONS: 'transactions',
  CREATOR_ORANGE_MONEY_ACCOUNTS: 'creator_orange_money_accounts',
  CREATOR_EARNINGS: 'creator_earnings',
  LOCKED_CONTENT: 'locked_content',
  GIFT_ITEMS: 'gift_items',
  WITHDRAWAL_REQUESTS: 'withdrawal_requests',
  PAYMENT_REQUESTS: 'payment_requests',
  SUBSCRIPTIONS: 'subscriptions',
  VERIFICATION_RECORDS: 'verification_records',
  REFERRALS: 'referrals',
  REPORTS: 'reports',
  SUPPORT_TICKETS: 'support_tickets',
  AD_CAMPAIGNS: 'ad_campaigns',
  AUDIT_LOGS: 'audit_logs',
  ADMIN_NOTIFICATIONS: 'admin_notifications',
  USER_BANS: 'user_bans',
  EVENTS: 'events',
  TICKETS: 'tickets',
  CHAT_READ_RECEIPTS: 'chat_read_receipts',
  PRODUCTS: 'Products',
  TYPING_INDICATORS: 'typing_indicators',
  CALLS: 'calls',
  AI_CONVERSATIONS: 'ai_conversations',
  AI_MESSAGES: 'ai_messages',
  ADMIN_REPORTS: 'admin_reports',
  SOUNDS: 'sounds',
  REEL_DRAFTS: 'reel_drafts',
  STORES: 'stores',
  MUSIC_UNLOCKS: 'music_unlocks',
  SECURITY_EVENTS: 'security_events',
  USER_ACTIVITY: 'user_activity',
} as const;

export const BUCKET = {
  AVATARS: 'avatars',
  COVERS: 'covers',
  POST_MEDIA: 'post_media',
  STORY_MEDIA: 'story_media',
  REEL_MEDIA: 'reel_media',
  MUSIC_TRACKS: 'music_tracks',
  ALBUM_COVERS: 'album_covers',
  VOICE_MESSAGES: 'voice_messages',
  PAYMENT_SCREENSHOTS: 'payment_screenshots',
  MESSAGE_MEDIA: 'message_media',
  EVENT_FLYERS: 'event_flyers',
  MARKETPLACE_IMAGES: 'Marketplace_Images',
  STORE_LOGOS: 'store_logos',
  SOUNDS: 'sounds',
} as const;

export const BUCKET_IMAGES = BUCKET.POST_MEDIA;
export const BUCKET_STORIES = BUCKET.STORY_MEDIA;
export const BUCKET_REEL = BUCKET.REEL_MEDIA;
export const BUCKET_MUSIC = BUCKET.MUSIC_TRACKS;

export const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { ID, Query, Permission, Role };

export function getFileUrl(bucketId: string, fileId: string): string {
  if (!fileId) return '';
  // Read files through the same-origin proxy. Several Appwrite buckets are
  // intentionally private, so direct browser URLs can return 401/403 even
  // though the server has permission to read them with the admin key.
  return `/api/file/${encodeURIComponent(bucketId)}/${encodeURIComponent(fileId)}`;
}

export interface PreviewOptions {
  width?: number;
  height?: number;
  quality?: number;
  output?: 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif';
}

export function getFilePreview(bucketId: string, fileId: string, opts: PreviewOptions = {}): string {
  if (!fileId) return '';
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  if (opts.height) params.set('height', String(opts.height));
  if (opts.quality) params.set('quality', String(opts.quality));
  if (opts.output) params.set('output', opts.output);
  const query = params.toString();
  return `/api/file/${encodeURIComponent(bucketId)}/${encodeURIComponent(fileId)}${query ? `?${query}` : ''}`;
}

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const AVATAR_SIZES: Record<AvatarSize, number> = { xs: 48, sm: 80, md: 128, lg: 240, xl: 480 };

export function getAvatarUrl(bucketId: string, fileId: string, size: AvatarSize = 'md'): string {
  if (!fileId) return '';
  const tier: string = typeof window !== 'undefined' ? ((window as any).__vimoreNetTier || 'rich') : 'rich';
  const px = AVATAR_SIZES[size];
  const quality = tier === 'lite' ? 50 : tier === 'standard' ? 70 : 80;
  const liteScale = tier === 'lite' ? 0.6 : tier === 'standard' ? 0.8 : 1;
  const dim = Math.round(px * liteScale);
  return getFilePreview(bucketId, fileId, { width: dim, height: dim, quality, output: 'webp' });
}

export function getImageUrl(bucketId: string, fileId: string, maxWidth: number = 720): string {
  if (!fileId) return '';
  const tier: string = typeof window !== 'undefined' ? ((window as any).__vimoreNetTier || 'rich') : 'rich';
  const quality = tier === 'lite' ? 55 : tier === 'standard' ? 70 : 80;
  const widthScale = tier === 'lite' ? 0.5 : tier === 'standard' ? 0.75 : 1;
  return getFilePreview(bucketId, fileId, { width: Math.round(maxWidth * widthScale), quality, output: 'webp' });
}

export function extractFileId(url: string): string | null {
  if (!url) return null;
  const proxyMatch = url.match(/^\/api\/file\/[^/]+\/([^/?]+)/);
  if (proxyMatch) return proxyMatch[1];
  const match = url.match(/\/files\/([^\/\?]+)/);
  if (match) return match[1];
  return null;
}

export function toProxyUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('/api/file/')) {
    const match = url.match(/^\/api\/file\/([^/]+)\/([^/?]+)/);
    if (match) return getFileUrl(match[1], match[2]);
  }
  // Migrate legacy direct Appwrite URLs to the same-origin proxy. Older
  // records stored these URLs before the proxy was introduced.
  const appwriteMatch = url.match(/\/storage\/buckets\/([^/]+)\/files\/([^/?]+)/);
  if (appwriteMatch) return getFileUrl(appwriteMatch[1], appwriteMatch[2]);
  return url;
}

export function isMediaUrl(value: string | undefined | null): value is string {
  return !!value && (
    value.startsWith('/api/file/') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('blob:') ||
    value.startsWith('data:')
  );
}

export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export function avatarFallback(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

export async function getSecurityQuestion(vimoreId: string): Promise<string | null> {
  try {
    const normalised = vimoreId.includes('@') ? vimoreId : `${vimoreId}@vimore.cfd`;
    const result = await databases.listDocuments(DATABASE_ID, COL.USERS, [
      Query.equal('email', normalised),
      Query.limit(1),
    ]);
    if (result.documents.length === 0) return null;
    return result.documents[0].security_question || null;
  } catch {
    return null;
  }
}

export async function verifySecurityAnswer(vimoreId: string, answer: string): Promise<boolean> {
  try {
    const normalised = vimoreId.includes('@') ? vimoreId : `${vimoreId}@vimore.cfd`;
    const result = await databases.listDocuments(DATABASE_ID, COL.USERS, [
      Query.equal('email', normalised),
      Query.limit(1),
    ]);
    if (result.documents.length === 0) return false;
    const stored = (result.documents[0].security_answer || '').toLowerCase().trim();
    return stored === answer.toLowerCase().trim();
  } catch {
    return false;
  }
}
