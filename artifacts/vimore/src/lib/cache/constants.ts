export const CACHE_TTL_MS = 5 * 60 * 60 * 1000; // 5 hours

export const FILE_CACHE_NAME = 'vimore-files-v1';

export const DB_CACHE_NAME = 'vimore-db-cache';
export const DB_CACHE_VERSION = 1;
export const DB_CACHE_STORE = 'documents';

export const COLLECTION_FIELDS: Record<string, string[]> = {
  users: [
    '$id', 'name', 'username', 'email', 'avatar_id', 'cover_id',
    'bio', 'vimore_id', 'is_verified', 'is_premium', 'gold_balance',
    'diamond_balance', 'star_balance', 'follower_count', 'following_count',
    'post_count', 'subscription_price', 'subscription_enabled',
  ],
  posts: [
    '$id', '$createdAt', 'user_id', 'content', 'media_ids', 'media_types',
    'like_count', 'comment_count', 'view_count', 'is_unlockable',
    'unlock_price', 'unlock_currency', 'is_boosted', 'repost_of',
    'audience', 'bucket_id',
  ],
  stories: [
    '$id', '$createdAt', 'user_id', 'expires_at', 'view_count',
  ],
  story_segments: [
    '$id', 'story_id', 'media_id', 'media_type', 'duration', 'order',
    'bucket_id',
  ],
  tracks: [
    '$id', '$createdAt', 'user_id', 'title', 'artist', 'cover_id',
    'file_id', 'duration', 'like_count', 'play_count', 'genre',
  ],
  albums: [
    '$id', '$createdAt', 'user_id', 'title', 'cover_id', 'track_count',
  ],
  messages: [
    '$id', '$createdAt', 'sender_id', 'receiver_id', 'cluster_id',
    'content', 'media_id', 'media_type', 'is_read', 'bucket_id',
  ],
  notifications: [
    '$id', '$createdAt', 'user_id', 'actor_id', 'type', 'reference_id',
    'is_read', 'message',
  ],
  follows: ['$id', 'follower_id', 'following_id', '$createdAt'],
  bookmarks: ['$id', 'user_id', 'post_id', '$createdAt'],
  post_reactions: ['$id', 'user_id', 'post_id', 'reaction', '$createdAt'],
  clusters: [
    '$id', 'name', 'description', 'cover_id', 'owner_id',
    'member_count', 'is_private',
  ],
};
