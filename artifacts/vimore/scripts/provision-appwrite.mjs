/**
 * ViMore — Full Appwrite Provisioning Script
 * Creates: database, all collections, all attributes, all indexes, all storage buckets
 *
 * Usage: node scripts/provision-appwrite.mjs
 */

import { Client, Databases, Storage, ID } from 'node-appwrite';
import 'dotenv/config';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'vimoreprod';

if (!API_KEY) { console.error('❌  APPWRITE_API_KEY is not set'); process.exit(1); }

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new Databases(client);
const storage = new Storage(client);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function ensureDatabase() {
  try {
    await db.create(DATABASE_ID, 'ViMore');
    console.log(`✅  Database created: ${DATABASE_ID}`);
  } catch (e) {
    if (e?.code === 409) console.log(`ℹ️   Database already exists: ${DATABASE_ID}`);
    else throw e;
  }
}

async function ensureCollection(collectionId, name) {
  try {
    await db.createCollection(DATABASE_ID, collectionId, name, undefined, false, true);
    console.log(`  ✅  Collection: ${collectionId}`);
    return true;
  } catch (e) {
    if (e?.code === 409) { console.log(`  ℹ️   Collection exists: ${collectionId}`); return false; }
    console.error(`  ❌  Collection ${collectionId}:`, e?.message);
    return false;
  }
}

async function createAttr(collectionId, attr) {
  const { key, type, size, required = false, array = false, defaultValue, min, max, elements } = attr;
  try {
    switch (type) {
      case 'string':
        await db.createStringAttribute(DATABASE_ID, collectionId, key, size || 255, required, defaultValue ?? null, array);
        break;
      case 'integer':
        await db.createIntegerAttribute(DATABASE_ID, collectionId, key, required, min ?? null, max ?? null, defaultValue ?? null, array);
        break;
      case 'float':
        await db.createFloatAttribute(DATABASE_ID, collectionId, key, required, min ?? null, max ?? null, defaultValue ?? null, array);
        break;
      case 'boolean':
        await db.createBooleanAttribute(DATABASE_ID, collectionId, key, required, defaultValue ?? null, array);
        break;
      case 'datetime':
        await db.createDatetimeAttribute(DATABASE_ID, collectionId, key, required, defaultValue ?? null, array);
        break;
      case 'enum':
        await db.createEnumAttribute(DATABASE_ID, collectionId, key, elements, required, defaultValue ?? null, array);
        break;
      default:
        console.warn(`    ⚠️  Unknown type ${type} for ${key}`);
    }
  } catch (e) {
    if (e?.code === 409) return; // already exists
    console.error(`    ❌  Attr ${collectionId}.${key}:`, e?.message);
  }
}

async function createAttrs(collectionId, attrs) {
  for (const attr of attrs) {
    await createAttr(collectionId, attr);
    await sleep(80); // short pause to avoid rate-limit
  }
}

async function waitForAttrs(collectionId, keys) {
  const start = Date.now();
  while (Date.now() - start < 90_000) {
    const col = await db.getCollection(DATABASE_ID, collectionId);
    const notReady = (col.attributes || []).filter(a => keys.includes(a.key) && a.status !== 'available');
    if (notReady.length === 0) return;
    await sleep(1500);
  }
  console.warn(`  ⚠️  Timed out waiting for attrs in ${collectionId}`);
}

async function createIndex(collectionId, key, type, attributes, orders) {
  try {
    await db.createIndex(DATABASE_ID, collectionId, key, type, attributes, orders);
  } catch (e) {
    if (e?.code === 409) return;
    console.error(`    ❌  Index ${collectionId}.${key}:`, e?.message);
  }
}

async function ensureBucket(bucketId, name) {
  try {
    await storage.createBucket(bucketId, name, undefined, undefined, true, undefined, ['jpg','jpeg','png','webp','gif','mp4','mp3','ogg','wav','pdf','heic']);
    console.log(`  ✅  Bucket: ${bucketId}`);
  } catch (e) {
    if (e?.code === 409) console.log(`  ℹ️   Bucket exists: ${bucketId}`);
    else console.error(`  ❌  Bucket ${bucketId}:`, e?.message);
  }
}

// ─── Schema Definition ────────────────────────────────────────────────────────

const COLLECTIONS = [
  {
    id: 'users', name: 'Users',
    attrs: [
      { key: 'name',                  type: 'string',   size: 128,  required: true  },
      { key: 'username',              type: 'string',   size: 64,   required: true  },
      { key: 'email',                 type: 'string',   size: 256,  required: true  },
      { key: 'bio',                   type: 'string',   size: 1000  },
      { key: 'category',              type: 'string',   size: 64    },
      { key: 'display_name',          type: 'string',   size: 128   },
      { key: 'is_verified',           type: 'boolean',  required: true, defaultValue: false },
      { key: 'has_ever_been_verified',type: 'boolean',  required: true, defaultValue: false },
      { key: 'followers_count',       type: 'integer',  required: true, defaultValue: 0 },
      { key: 'following_count',       type: 'integer',  required: true, defaultValue: 0 },
      { key: 'friends_count',         type: 'integer',  required: true, defaultValue: 0 },
      { key: 'posts_count',           type: 'integer',  required: true, defaultValue: 0 },
      { key: 'gold_balance',          type: 'float',    required: true, defaultValue: 0 },
      { key: 'diamond_balance',       type: 'float',    required: true, defaultValue: 0 },
      { key: 'star_balance',          type: 'float',    required: true, defaultValue: 0 },
      { key: 'role',                  type: 'string',   size: 32,   required: true, defaultValue: 'USER' },
      { key: 'join_date',             type: 'datetime'  },
      { key: 'nationality',           type: 'string',   size: 64    },
      { key: 'date_of_birth',         type: 'string',   size: 32    },
      { key: 'gender',                type: 'string',   size: 16    },
      { key: 'referral_code',         type: 'string',   size: 32,   required: true  },
      { key: 'referral_count',        type: 'integer',  defaultValue: 0 },
      { key: 'language',              type: 'string',   size: 16    },
      { key: 'security_question',     type: 'string',   size: 256   },
      { key: 'security_answer',       type: 'string',   size: 256   },
      { key: 'phone',                 type: 'string',   size: 32    },
      { key: 'avatar',                type: 'string',   size: 512   },
      { key: 'avatar_id',             type: 'string',   size: 36    },
      { key: 'cover',                 type: 'string',   size: 512   },
      { key: 'cover_id',              type: 'string',   size: 36    },
      { key: 'subscription_price',    type: 'float',    defaultValue: 0 },
      { key: 'warning_count',         type: 'integer',  defaultValue: 0 },
      { key: 'is_suspended',          type: 'boolean',  defaultValue: false },
      { key: 'suspended_until',       type: 'datetime'  },
      { key: 'push_token',            type: 'string',   size: 512   },
      { key: 'push_enabled',          type: 'boolean',  defaultValue: false },
    ],
    indexes: [
      { key: 'idx_email',            type: 'key',    attributes: ['email'],            orders: ['ASC']  },
      { key: 'idx_username',         type: 'key',    attributes: ['username'],         orders: ['ASC']  },
      { key: 'idx_phone',            type: 'key',    attributes: ['phone'],            orders: ['ASC']  },
      { key: 'idx_role',             type: 'key',    attributes: ['role'],             orders: ['ASC']  },
      { key: 'idx_referral_code',    type: 'key',    attributes: ['referral_code'],    orders: ['ASC']  },
      { key: 'idx_followers_count',  type: 'key',    attributes: ['followers_count'],  orders: ['DESC'] },
    ],
  },
  {
    id: 'posts', name: 'Posts',
    attrs: [
      { key: 'user_id',          type: 'string',  size: 36,   required: true },
      { key: 'content',          type: 'string',  size: 5000  },
      { key: 'likes_count',      type: 'integer', required: true, defaultValue: 0 },
      { key: 'unlikes_count',    type: 'integer', required: true, defaultValue: 0 },
      { key: 'comments_count',   type: 'integer', required: true, defaultValue: 0 },
      { key: 'shares_count',     type: 'integer', required: true, defaultValue: 0 },
      { key: 'views_count',      type: 'integer', required: true, defaultValue: 0 },
      { key: 'is_locked',        type: 'boolean', required: true, defaultValue: false },
      { key: 'is_boosted',       type: 'boolean', required: true, defaultValue: false },
      { key: 'boost_current_views', type: 'integer', defaultValue: 0 },
      { key: 'boost_expiry',     type: 'datetime' },
      { key: 'comments_disabled',type: 'boolean', required: true, defaultValue: false },
      { key: 'hashtags',         type: 'string',  size: 64,   array: true },
      { key: 'tagged_users',     type: 'string',  size: 36,   array: true },
      { key: 'link_preview',     type: 'string',  size: 2000  },
      { key: 'image_ids',        type: 'string',  size: 36,   array: true },
      { key: 'video_id',         type: 'string',  size: 36    },
      { key: 'theme',            type: 'string',  size: 32    },
      { key: 'image_filter',     type: 'string',  size: 32    },
      { key: 'feeling',          type: 'string',  size: 64    },
      { key: 'location',         type: 'string',  size: 128   },
      { key: 'unlock_price',     type: 'float'    },
      { key: 'poll',             type: 'string',  size: 2000  },
      { key: 'shared_post_data', type: 'string',  size: 8000  },
    ],
    indexes: [
      { key: 'idx_user_id',    type: 'key', attributes: ['user_id'],    orders: ['ASC']  },
      { key: 'idx_created_at', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
      { key: 'idx_is_boosted', type: 'key', attributes: ['is_boosted'], orders: ['ASC']  },
    ],
  },
  {
    id: 'post_comments', name: 'Post Comments',
    attrs: [
      { key: 'post_id',     type: 'string',  size: 36,   required: true },
      { key: 'user_id',     type: 'string',  size: 36,   required: true },
      { key: 'user_name',   type: 'string',  size: 128,  required: true },
      { key: 'user_avatar', type: 'string',  size: 512   },
      { key: 'text',        type: 'string',  size: 2000, required: true },
      { key: 'timestamp',   type: 'integer'  },
      { key: 'parent_id',   type: 'string',  size: 36    },
    ],
    indexes: [
      { key: 'idx_post_id',    type: 'key', attributes: ['post_id'],    orders: ['ASC']  },
      { key: 'idx_created_at', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
    ],
  },
  {
    id: 'post_reactions', name: 'Post Reactions',
    attrs: [
      { key: 'post_id', type: 'string', size: 36, required: true },
      { key: 'user_id', type: 'string', size: 36, required: true },
      { key: 'type',    type: 'string', size: 16, defaultValue: 'like' },
    ],
    indexes: [
      { key: 'idx_post_id', type: 'key', attributes: ['post_id'], orders: ['ASC'] },
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'post_unlocks', name: 'Post Unlocks',
    attrs: [
      { key: 'post_id', type: 'string', size: 36, required: true },
      { key: 'user_id', type: 'string', size: 36, required: true },
    ],
    indexes: [
      { key: 'idx_post_user', type: 'key', attributes: ['post_id', 'user_id'], orders: ['ASC', 'ASC'] },
    ],
  },
  {
    id: 'bookmarks', name: 'Bookmarks',
    attrs: [
      { key: 'post_id', type: 'string', size: 36, required: true },
      { key: 'user_id', type: 'string', size: 36, required: true },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'stories', name: 'Stories',
    attrs: [
      { key: 'user_id',    type: 'string',   size: 36,   required: true },
      { key: 'expires_at', type: 'datetime'  },
      { key: 'views_count',type: 'integer',  defaultValue: 0 },
      { key: 'story_url',  type: 'string',   size: 2000  },
    ],
    indexes: [
      { key: 'idx_user_id',    type: 'key', attributes: ['user_id'],    orders: ['ASC']  },
      { key: 'idx_expires_at', type: 'key', attributes: ['expires_at'], orders: ['ASC']  },
    ],
  },
  {
    id: 'story_segments', name: 'Story Segments',
    attrs: [
      { key: 'story_id',    type: 'string',  size: 36,   required: true },
      { key: 'type',        type: 'string',  size: 16,   defaultValue: 'image' },
      { key: 'order_index', type: 'integer', defaultValue: 0 },
      { key: 'duration',    type: 'integer', defaultValue: 5 },
      { key: 'story_url',   type: 'string',  size: 2000  },
      { key: 'media_id',    type: 'string',  size: 36    },
      { key: 'text',        type: 'string',  size: 500   },
    ],
    indexes: [
      { key: 'idx_story_id', type: 'key', attributes: ['story_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'story_views', name: 'Story Views',
    attrs: [
      { key: 'story_id', type: 'string', size: 36, required: true },
      { key: 'user_id',  type: 'string', size: 36, required: true },
    ],
    indexes: [
      { key: 'idx_story_id', type: 'key', attributes: ['story_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'follows', name: 'Follows',
    attrs: [
      { key: 'follower_id',        type: 'string', size: 36, required: true },
      { key: 'following_id',       type: 'string', size: 36, required: true },
      { key: 'follower_username',  type: 'string', size: 64  },
      { key: 'following_username', type: 'string', size: 64  },
    ],
    indexes: [
      { key: 'idx_follower_id',  type: 'key', attributes: ['follower_id'],  orders: ['ASC'] },
      { key: 'idx_following_id', type: 'key', attributes: ['following_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'friend_requests', name: 'Friend Requests',
    attrs: [
      { key: 'from_user_id', type: 'string', size: 36, required: true },
      { key: 'to_user_id',   type: 'string', size: 36, required: true },
      { key: 'status',       type: 'string', size: 16, defaultValue: 'PENDING' },
    ],
    indexes: [
      { key: 'idx_from_user_id', type: 'key', attributes: ['from_user_id'], orders: ['ASC'] },
      { key: 'idx_to_user_id',   type: 'key', attributes: ['to_user_id'],   orders: ['ASC'] },
      { key: 'idx_status',       type: 'key', attributes: ['status'],        orders: ['ASC'] },
    ],
  },
  {
    id: 'blocked_users', name: 'Blocked Users',
    attrs: [
      { key: 'blocker_id', type: 'string', size: 36, required: true },
      { key: 'blocked_id', type: 'string', size: 36, required: true },
    ],
    indexes: [
      { key: 'idx_blocker_id', type: 'key', attributes: ['blocker_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'messages', name: 'Messages',
    attrs: [
      { key: 'sender_id',           type: 'string',  size: 36,   required: true },
      { key: 'receiver_id',         type: 'string',  size: 36    },
      { key: 'sender_name',         type: 'string',  size: 128,  required: true },
      { key: 'sender_avatar',       type: 'string',  size: 512   },
      { key: 'type',                type: 'string',  size: 20,   defaultValue: 'text' },
      { key: 'text',                type: 'string',  size: 4000  },
      { key: 'media_id',            type: 'string',  size: 36    },
      { key: 'media_url',           type: 'string',  size: 2000  },
      { key: 'voice_duration',      type: 'string',  size: 20    },
      { key: 'is_read',             type: 'boolean', defaultValue: false },
      { key: 'post_id',             type: 'string',  size: 36    },
      { key: 'shared_post_data',    type: 'string',  size: 8000  },
      { key: 'reply_to_id',         type: 'string',  size: 36    },
      { key: 'reply_to_text',       type: 'string',  size: 500   },
      { key: 'reply_to_sender_name',type: 'string',  size: 128   },
      { key: 'reply_to_type',       type: 'string',  size: 20    },
      { key: 'is_view_once',        type: 'boolean', defaultValue: false },
      { key: 'is_viewed',           type: 'boolean', defaultValue: false },
    ],
    indexes: [
      { key: 'idx_sender_id',   type: 'key', attributes: ['sender_id'],   orders: ['ASC']  },
      { key: 'idx_receiver_id', type: 'key', attributes: ['receiver_id'], orders: ['ASC']  },
      { key: 'idx_created_at',  type: 'key', attributes: ['$createdAt'],  orders: ['DESC'] },
    ],
  },
  {
    id: 'group_messages', name: 'Group Messages',
    attrs: [
      { key: 'cluster_id',          type: 'string',  size: 36,   required: true },
      { key: 'sender_id',           type: 'string',  size: 36,   required: true },
      { key: 'sender_name',         type: 'string',  size: 128,  required: true },
      { key: 'sender_avatar',       type: 'string',  size: 512   },
      { key: 'type',                type: 'string',  size: 20,   defaultValue: 'text' },
      { key: 'text',                type: 'string',  size: 4000  },
      { key: 'media_id',            type: 'string',  size: 36    },
      { key: 'media_url',           type: 'string',  size: 2000  },
      { key: 'voice_duration',      type: 'string',  size: 20    },
      { key: 'is_read',             type: 'boolean', defaultValue: false },
      { key: 'post_id',             type: 'string',  size: 36    },
      { key: 'shared_post_data',    type: 'string',  size: 8000  },
      { key: 'reply_to_id',         type: 'string',  size: 36    },
      { key: 'reply_to_text',       type: 'string',  size: 500   },
      { key: 'reply_to_sender_name',type: 'string',  size: 128   },
      { key: 'reply_to_type',       type: 'string',  size: 20    },
      { key: 'is_view_once',        type: 'boolean', defaultValue: false },
      { key: 'is_viewed',           type: 'boolean', defaultValue: false },
    ],
    indexes: [
      { key: 'idx_cluster_id', type: 'key', attributes: ['cluster_id'], orders: ['ASC']  },
      { key: 'idx_created_at', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
    ],
  },
  {
    id: 'clusters', name: 'Clusters',
    attrs: [
      { key: 'name',           type: 'string',  size: 128, required: true },
      { key: 'admin_id',       type: 'string',  size: 36,  required: true },
      { key: 'admin_username', type: 'string',  size: 64   },
      { key: 'is_add_locked',  type: 'boolean', defaultValue: false },
      { key: 'avatar_id',      type: 'string',  size: 36   },
    ],
    indexes: [
      { key: 'idx_admin_id', type: 'key', attributes: ['admin_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'cluster_members', name: 'Cluster Members',
    attrs: [
      { key: 'cluster_id', type: 'string',   size: 36, required: true },
      { key: 'user_id',    type: 'string',   size: 36, required: true },
      { key: 'username',   type: 'string',   size: 64  },
      { key: 'joined_at',  type: 'datetime'  },
    ],
    indexes: [
      { key: 'idx_cluster_id', type: 'key', attributes: ['cluster_id'], orders: ['ASC'] },
      { key: 'idx_user_id',    type: 'key', attributes: ['user_id'],    orders: ['ASC'] },
    ],
  },
  {
    id: 'tracks', name: 'Tracks',
    attrs: [
      { key: 'user_id',          type: 'string',  size: 36,  required: true },
      { key: 'title',            type: 'string',  size: 256, required: true },
      { key: 'artist',           type: 'string',  size: 128  },
      { key: 'artist_username',  type: 'string',  size: 64   },
      { key: 'duration',         type: 'integer', defaultValue: 0 },
      { key: 'plays_count',      type: 'integer', defaultValue: 0 },
      { key: 'likes_count',      type: 'integer', defaultValue: 0 },
      { key: 'streams',          type: 'string',  size: 32,  defaultValue: '0' },
      { key: 'genre',            type: 'string',  size: 64   },
      { key: 'is_explicit',      type: 'boolean', defaultValue: false },
      { key: 'is_published',     type: 'boolean', defaultValue: true  },
      { key: 'file_id',          type: 'string',  size: 36   },
      { key: 'cover_id',         type: 'string',  size: 36   },
      { key: 'album_id',         type: 'string',  size: 36   },
      { key: 'track_number',     type: 'integer', defaultValue: 0 },
      { key: 'is_locked',        type: 'boolean', defaultValue: false },
      { key: 'unlock_price',     type: 'float',   defaultValue: 0 },
    ],
    indexes: [
      { key: 'idx_user_id',    type: 'key', attributes: ['user_id'],    orders: ['ASC']  },
      { key: 'idx_created_at', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
    ],
  },
  {
    id: 'track_likes', name: 'Track Likes',
    attrs: [
      { key: 'track_id', type: 'string', size: 36, required: true },
      { key: 'user_id',  type: 'string', size: 36, required: true },
    ],
    indexes: [
      { key: 'idx_track_user', type: 'key', attributes: ['track_id', 'user_id'], orders: ['ASC', 'ASC'] },
    ],
  },
  {
    id: 'albums', name: 'Albums',
    attrs: [
      { key: 'user_id',         type: 'string',  size: 36,  required: true },
      { key: 'title',           type: 'string',  size: 256, required: true },
      { key: 'artist',          type: 'string',  size: 128  },
      { key: 'artist_username', type: 'string',  size: 64   },
      { key: 'tracks_count',    type: 'integer', defaultValue: 0 },
      { key: 'genre',           type: 'string',  size: 64   },
      { key: 'is_published',    type: 'boolean', defaultValue: true },
      { key: 'cover_id',        type: 'string',  size: 36   },
      { key: 'is_locked',       type: 'boolean', defaultValue: false },
      { key: 'unlock_price',    type: 'float',   defaultValue: 0 },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'playlists', name: 'Playlists',
    attrs: [
      { key: 'user_id',      type: 'string',  size: 36,  required: true },
      { key: 'title',        type: 'string',  size: 256, required: true },
      { key: 'tracks_count', type: 'integer', defaultValue: 0 },
      { key: 'cover_id',     type: 'string',  size: 36   },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'playlist_tracks', name: 'Playlist Tracks',
    attrs: [
      { key: 'playlist_id', type: 'string', size: 36, required: true },
      { key: 'track_id',    type: 'string', size: 36, required: true },
    ],
    indexes: [
      { key: 'idx_playlist_id', type: 'key', attributes: ['playlist_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'notifications', name: 'Notifications',
    attrs: [
      { key: 'user_id',          type: 'string',  size: 36,   required: true },
      { key: 'from_user_id',     type: 'string',  size: 36    },
      { key: 'from_user_name',   type: 'string',  size: 128   },
      { key: 'from_user_avatar', type: 'string',  size: 512   },
      { key: 'type',             type: 'string',  size: 32,   required: true },
      { key: 'title',            type: 'string',  size: 256   },
      { key: 'content',          type: 'string',  size: 1000  },
      { key: 'message',          type: 'string',  size: 1000  },
      { key: 'is_read',          type: 'boolean', defaultValue: false },
      { key: 'post_id',          type: 'string',  size: 36    },
      { key: 'action_url',       type: 'string',  size: 512   },
    ],
    indexes: [
      { key: 'idx_user_id',    type: 'key', attributes: ['user_id'],    orders: ['ASC']  },
      { key: 'idx_is_read',    type: 'key', attributes: ['is_read'],    orders: ['ASC']  },
      { key: 'idx_created_at', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
    ],
  },
  {
    id: 'creator_orange_money_accounts', name: 'Creator Orange Money Accounts',
    attrs: [
      { key: 'userId', type: 'string', size: 36, required: true },
      { key: 'orangeMoneyNumber', type: 'string', size: 32, required: true },
      { key: 'accountName', type: 'string', size: 128, required: true },
      { key: 'isVerified', type: 'boolean', required: true, defaultValue: false },
      { key: 'createdAt', type: 'datetime', required: true },
      { key: 'updatedAt', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['userId'], orders: ['ASC'] },
      { key: 'idx_orange_money_number', type: 'key', attributes: ['orangeMoneyNumber'], orders: ['ASC'] },
    ],
  },
  {
    id: 'transactions', name: 'Transactions',
    attrs: [
      { key: 'transactionId', type: 'string', size: 64, required: true },
      { key: 'senderUserId', type: 'string', size: 36, required: true },
      { key: 'receiverUserId', type: 'string', size: 36, required: true },
      { key: 'transactionType', type: 'enum', elements: ['gift', 'subscription', 'unlock_post', 'unlock_music'], required: true },
      { key: 'amountLD', type: 'integer', required: true },
      { key: 'itemId', type: 'string', size: 64 },
      { key: 'itemType', type: 'enum', elements: ['post', 'music', 'gift_item'] },
      { key: 'orangeMoneyRef', type: 'string', size: 128 },
      { key: 'status', type: 'enum', elements: ['pending', 'completed', 'failed', 'cancelled'], required: true, defaultValue: 'pending' },
      { key: 'createdAt', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'idx_transaction_id', type: 'key', attributes: ['transactionId'], orders: ['ASC'] },
      { key: 'idx_sender_user_id', type: 'key', attributes: ['senderUserId'], orders: ['ASC'] },
      { key: 'idx_receiver_user_id', type: 'key', attributes: ['receiverUserId'], orders: ['ASC'] },
      { key: 'idx_transaction_type', type: 'key', attributes: ['transactionType'], orders: ['ASC'] },
      { key: 'idx_amount_ld', type: 'key', attributes: ['amountLD'], orders: ['ASC'] },
      { key: 'idx_item_id', type: 'key', attributes: ['itemId'], orders: ['ASC'] },
      { key: 'idx_item_type', type: 'key', attributes: ['itemType'], orders: ['ASC'] },
      { key: 'idx_orange_money_ref', type: 'key', attributes: ['orangeMoneyRef'], orders: ['ASC'] },
      { key: 'idx_status', type: 'key', attributes: ['status'], orders: ['ASC'] },
      { key: 'idx_created_at', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
    ],
  },
  {
    id: 'creator_earnings', name: 'Creator Earnings',
    attrs: [
      { key: 'userId', type: 'string', size: 36, required: true },
      { key: 'totalEarningsLD', type: 'integer', required: true },
      { key: 'giftsEarningsLD', type: 'integer', required: true },
      { key: 'subscriptionsEarningsLD', type: 'integer', required: true },
      { key: 'lockedPostsEarningsLD', type: 'integer', required: true },
      { key: 'lockedMusicEarningsLD', type: 'integer', required: true },
      { key: 'lastUpdated', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'idx_creator_earnings_user', type: 'key', attributes: ['userId'], orders: ['ASC'] },
    ],
  },
  {
    id: 'locked_content', name: 'Locked Content',
    attrs: [
      { key: 'contentId', type: 'string', size: 64, required: true },
      { key: 'creatorUserId', type: 'string', size: 36, required: true },
      { key: 'contentType', type: 'enum', elements: ['post', 'music'], required: true },
      { key: 'priceLD', type: 'integer', required: true },
      { key: 'isLocked', type: 'boolean', required: true },
      { key: 'createdAt', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'idx_locked_content_id', type: 'key', attributes: ['contentId'], orders: ['ASC'] },
      { key: 'idx_locked_content_creator', type: 'key', attributes: ['creatorUserId'], orders: ['ASC'] },
      { key: 'idx_locked_content_type', type: 'key', attributes: ['contentType'], orders: ['ASC'] },
      { key: 'idx_locked_content_price', type: 'key', attributes: ['priceLD'], orders: ['ASC'] },
    ],
  },
  {
    id: 'subscriptions', name: 'Subscriptions',
    attrs: [
      { key: 'subscriptionId', type: 'string', size: 64, required: true },
      { key: 'subscriberUserId', type: 'string', size: 36, required: true },
      { key: 'creatorUserId', type: 'string', size: 36, required: true },
      { key: 'amountLD', type: 'integer', required: true },
      { key: 'startDate', type: 'datetime', required: true },
      { key: 'endDate', type: 'datetime', required: true },
      { key: 'isActive', type: 'boolean', required: true },
      { key: 'autoRenew', type: 'boolean', required: true },
    ],
    indexes: [
      { key: 'idx_subscription_id', type: 'key', attributes: ['subscriptionId'], orders: ['ASC'] },
      { key: 'idx_subscriber_user_id', type: 'key', attributes: ['subscriberUserId'], orders: ['ASC'] },
      { key: 'idx_creator_user_id', type: 'key', attributes: ['creatorUserId'], orders: ['ASC'] },
      { key: 'idx_start_date', type: 'key', attributes: ['startDate'], orders: ['ASC'] },
      { key: 'idx_end_date', type: 'key', attributes: ['endDate'], orders: ['ASC'] },
      { key: 'idx_is_active', type: 'key', attributes: ['isActive'], orders: ['ASC'] },
    ],
  },
  {
    id: 'gift_items', name: 'Gift Items',
    attrs: [
      { key: 'giftId', type: 'string', size: 64, required: true },
      { key: 'name', type: 'string', size: 128, required: true },
      { key: 'priceLD', type: 'integer', required: true },
      { key: 'category', type: 'string', size: 64, required: true },
      { key: 'iconUrl', type: 'string', size: 512, required: true },
      { key: 'isActive', type: 'boolean', required: true },
    ],
    indexes: [
      { key: 'idx_gift_id', type: 'key', attributes: ['giftId'], orders: ['ASC'] },
      { key: 'idx_gift_price', type: 'key', attributes: ['priceLD'], orders: ['ASC'] },
      { key: 'idx_gift_category', type: 'key', attributes: ['category'], orders: ['ASC'] },
    ],
  },
  {
    id: 'withdrawal_requests', name: 'Withdrawal Requests',
    attrs: [
      { key: 'user_id',        type: 'string', size: 36,  required: true },
      { key: 'username',       type: 'string', size: 64   },
      { key: 'amount',         type: 'float',  required: true },
      { key: 'currency',       type: 'string', size: 16   },
      { key: 'method',         type: 'string', size: 32   },
      { key: 'account_name',   type: 'string', size: 128  },
      { key: 'account_number', type: 'string', size: 128  },
      { key: 'payout_amount',  type: 'float'   },
      { key: 'payout_currency',type: 'string', size: 16   },
      { key: 'status',         type: 'string', size: 16,  defaultValue: 'PENDING' },
      { key: 'admin_message',  type: 'string', size: 512  },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC']  },
      { key: 'idx_status',  type: 'key', attributes: ['status'],  orders: ['ASC']  },
    ],
  },
  {
    id: 'payment_requests', name: 'Payment Requests',
    attrs: [
      { key: 'user_id',       type: 'string',  size: 36,  required: true },
      { key: 'from_user_id',  type: 'string',  size: 36   },
      { key: 'to_user_id',    type: 'string',  size: 36   },
      { key: 'username',      type: 'string',  size: 64   },
      { key: 'name',          type: 'string',  size: 128  },
      { key: 'currency',      type: 'string',  size: 16   },
      { key: 'amount',        type: 'float'    },
      { key: 'message',       type: 'string',  size: 512  },
      { key: 'package_name',  type: 'string',  size: 128  },
      { key: 'coin_type',     type: 'string',  size: 16   },
      { key: 'coin_amount',   type: 'integer', defaultValue: 0 },
      { key: 'screenshot_id', type: 'string',  size: 36   },
      { key: 'status',        type: 'string',  size: 16,  defaultValue: 'PENDING' },
      { key: 'code',          type: 'string',  size: 64   },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC']  },
      { key: 'idx_status',  type: 'key', attributes: ['status'],  orders: ['ASC']  },
    ],
  },
  {
    id: 'subscriptions', name: 'Subscriptions',
    attrs: [
      { key: 'subscriber_id',      type: 'string',   size: 36, required: true },
      { key: 'creator_id',         type: 'string',   size: 36, required: true },
      { key: 'creator_username',   type: 'string',   size: 64  },
      { key: 'subscriber_username',type: 'string',   size: 64  },
      { key: 'price',              type: 'float',    defaultValue: 0 },
      { key: 'status',             type: 'string',   size: 16, defaultValue: 'ACTIVE' },
      { key: 'expires_at',         type: 'datetime'  },
    ],
    indexes: [
      { key: 'idx_subscriber_id', type: 'key', attributes: ['subscriber_id'], orders: ['ASC'] },
      { key: 'idx_creator_id',    type: 'key', attributes: ['creator_id'],    orders: ['ASC'] },
      { key: 'idx_status',        type: 'key', attributes: ['status'],        orders: ['ASC'] },
    ],
  },
  {
    id: 'verification_records', name: 'Verification Records',
    attrs: [
      { key: 'user_id',    type: 'string',   size: 36, required: true },
      { key: 'status',     type: 'string',   size: 16, defaultValue: 'PENDING' },
      { key: 'notes',      type: 'string',   size: 1000 },
      { key: 'reviewed_by',type: 'string',   size: 36  },
      { key: 'submitted_at',type:'datetime'  },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
      { key: 'idx_status',  type: 'key', attributes: ['status'],  orders: ['ASC'] },
    ],
  },
  {
    id: 'referrals', name: 'Referrals',
    attrs: [
      { key: 'referrer_id',   type: 'string', size: 36, required: true },
      { key: 'referee_id',    type: 'string', size: 36, required: true },
      { key: 'referral_code', type: 'string', size: 32  },
      { key: 'status',        type: 'string', size: 16, defaultValue: 'COMPLETED' },
    ],
    indexes: [
      { key: 'idx_referrer_id', type: 'key', attributes: ['referrer_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'reports', name: 'Reports',
    attrs: [
      { key: 'reporter_id',  type: 'string', size: 36,   required: true },
      { key: 'target_id',    type: 'string', size: 36,   required: true },
      { key: 'target_type',  type: 'string', size: 16    },
      { key: 'reason',       type: 'string', size: 128   },
      { key: 'details',      type: 'string', size: 2000  },
      { key: 'status',       type: 'string', size: 16,   defaultValue: 'PENDING' },
    ],
    indexes: [
      { key: 'idx_status',     type: 'key', attributes: ['status'],     orders: ['ASC'] },
      { key: 'idx_target_id',  type: 'key', attributes: ['target_id'],  orders: ['ASC'] },
    ],
  },
  {
    id: 'support_tickets', name: 'Support Tickets',
    attrs: [
      { key: 'user_id',  type: 'string', size: 36,   required: true },
      { key: 'username', type: 'string', size: 64    },
      { key: 'subject',  type: 'string', size: 256   },
      { key: 'message',  type: 'string', size: 4000  },
      { key: 'category', type: 'string', size: 32    },
      { key: 'status',   type: 'string', size: 16,   defaultValue: 'OPEN' },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
      { key: 'idx_status',  type: 'key', attributes: ['status'],  orders: ['ASC'] },
    ],
  },
  {
    id: 'ad_campaigns', name: 'Ad Campaigns',
    attrs: [
      { key: 'user_id',        type: 'string',  size: 36,   required: true },
      { key: 'title',          type: 'string',  size: 256   },
      { key: 'content',        type: 'string',  size: 2000  },
      { key: 'media_url',      type: 'string',  size: 2000  },
      { key: 'media_id',       type: 'string',  size: 36    },
      { key: 'placement',      type: 'string',  size: 32    },
      { key: 'type',           type: 'string',  size: 16    },
      { key: 'status',         type: 'string',  size: 16,   defaultValue: 'ACTIVE' },
      { key: 'is_active',      type: 'boolean', defaultValue: true },
      { key: 'impressions',    type: 'integer', defaultValue: 0 },
      { key: 'clicks',         type: 'integer', defaultValue: 0 },
      { key: 'action_url',     type: 'string',  size: 512   },
      { key: 'action_label',   type: 'string',  size: 64    },
      { key: 'budget',         type: 'float',   defaultValue: 0 },
      { key: 'spent',          type: 'float',   defaultValue: 0 },
      { key: 'expires_at',     type: 'datetime' },
      { key: 'contact_type',   type: 'string',  size: 16    },
      { key: 'days_purchased', type: 'integer', defaultValue: 0 },
      { key: 'diamonds_spent', type: 'float',   defaultValue: 0 },
      { key: 'credits_spent',  type: 'integer', defaultValue: 0 },
    ],
    indexes: [
      { key: 'idx_user_id',   type: 'key', attributes: ['user_id'],   orders: ['ASC'] },
      { key: 'idx_is_active', type: 'key', attributes: ['is_active'], orders: ['ASC'] },
      { key: 'idx_status',    type: 'key', attributes: ['status'],    orders: ['ASC'] },
      { key: 'idx_expires_at',type: 'key', attributes: ['expires_at'],orders: ['ASC'] },
    ],
  },
  {
    id: 'audit_logs', name: 'Audit Logs',
    attrs: [
      { key: 'action',              type: 'string', size: 256,  required: true },
      { key: 'details',             type: 'string', size: 4000  },
      { key: 'performed_by',        type: 'string', size: 64    },
      { key: 'performed_by_avatar', type: 'string', size: 512   },
    ],
    indexes: [
      { key: 'idx_created_at', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
    ],
  },
  {
    id: 'admin_notifications', name: 'Admin Notifications',
    attrs: [
      { key: 'user_id',    type: 'string',  size: 36,   required: true },
      { key: 'type',       type: 'string',  size: 32    },
      { key: 'title',      type: 'string',  size: 256   },
      { key: 'content',    type: 'string',  size: 2000  },
      { key: 'message',    type: 'string',  size: 2000  },
      { key: 'is_read',    type: 'boolean', defaultValue: false },
      { key: 'action_url', type: 'string',  size: 512   },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'user_bans', name: 'User Bans',
    attrs: [
      { key: 'user_id',      type: 'string',   size: 36,   required: true },
      { key: 'admin_id',     type: 'string',   size: 36    },
      { key: 'reason',       type: 'string',   size: 2000  },
      { key: 'banned_until', type: 'datetime'  },
      { key: 'is_permanent', type: 'boolean',  defaultValue: false },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'events', name: 'Events',
    attrs: [
      { key: 'title',        type: 'string',  size: 256,  required: true },
      { key: 'description',  type: 'string',  size: 4000  },
      { key: 'venue',        type: 'string',  size: 256   },
      { key: 'event_date',   type: 'string',  size: 32    },
      { key: 'start_time',   type: 'string',  size: 16    },
      { key: 'end_time',     type: 'string',  size: 16    },
      { key: 'flyer_id',     type: 'string',  size: 36    },
      { key: 'flyer_url',    type: 'string',  size: 2000  },
      { key: 'ticket_price', type: 'float',   defaultValue: 0 },
      { key: 'is_active',    type: 'boolean', defaultValue: true },
      { key: 'created_by',   type: 'string',  size: 36    },
    ],
    indexes: [
      { key: 'idx_is_active',  type: 'key', attributes: ['is_active'],  orders: ['ASC']  },
      { key: 'idx_created_at', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
    ],
  },
  {
    id: 'tickets', name: 'Tickets',
    attrs: [
      { key: 'event_id',              type: 'string',  size: 36,  required: true },
      { key: 'user_id',               type: 'string',  size: 36,  required: true },
      { key: 'serial_number',         type: 'string',  size: 64   },
      { key: 'is_used',               type: 'boolean', defaultValue: false },
      { key: 'event_title',           type: 'string',  size: 256  },
      { key: 'event_date',            type: 'string',  size: 32   },
      { key: 'event_venue',           type: 'string',  size: 256  },
      { key: 'event_start_time',      type: 'string',  size: 16   },
      { key: 'event_end_time',        type: 'string',  size: 16   },
      { key: 'price_paid',            type: 'float',   defaultValue: 0 },
      { key: 'owner_name',            type: 'string',  size: 128  },
      { key: 'owner_avatar',          type: 'string',  size: 512  },
      { key: 'purchased_by_user_id',  type: 'string',  size: 36   },
      { key: 'purchased_by_name',     type: 'string',  size: 128  },
      { key: 'reminder_1_sent',       type: 'boolean', defaultValue: false },
      { key: 'reminder_2_sent',       type: 'boolean', defaultValue: false },
      { key: 'reminder_3_sent',       type: 'boolean', defaultValue: false },
      { key: 'reminder_4_sent',       type: 'boolean', defaultValue: false },
      { key: 'reminder_5_sent',       type: 'boolean', defaultValue: false },
      { key: 'reminder_6_sent',       type: 'boolean', defaultValue: false },
    ],
    indexes: [
      { key: 'idx_user_id',  type: 'key', attributes: ['user_id'],  orders: ['ASC'] },
      { key: 'idx_event_id', type: 'key', attributes: ['event_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'chat_read_receipts', name: 'Chat Read Receipts',
    attrs: [
      { key: 'user_id',     type: 'string', size: 36, required: true },
      { key: 'cluster_id',  type: 'string', size: 36, required: true },
      { key: 'last_read_at',type: 'string', size: 64  },
    ],
    indexes: [
      { key: 'idx_cluster_id', type: 'key', attributes: ['cluster_id'], orders: ['ASC'] },
      { key: 'idx_user_id',    type: 'key', attributes: ['user_id'],    orders: ['ASC'] },
    ],
  },
  {
    id: 'Products', name: 'Products',
    attrs: [
      { key: 'sellerId',           type: 'string',  size: 36,   required: true },
      { key: 'sellerName',         type: 'string',  size: 128   },
      { key: 'sellerUsername',     type: 'string',  size: 64    },
      { key: 'sellerAvatarFileId', type: 'string',  size: 36    },
      { key: 'name',               type: 'string',  size: 256,  required: true },
      { key: 'description',        type: 'string',  size: 4000  },
      { key: 'priceAmount',        type: 'float',   required: true },
      { key: 'priceCurrency',      type: 'string',  size: 16    },
      { key: 'location',           type: 'string',  size: 128   },
      { key: 'phoneNumber',        type: 'string',  size: 32    },
      { key: 'imageFileIds',       type: 'string',  size: 36,   array: true },
      { key: 'status',             type: 'string',  size: 16,   defaultValue: 'active' },
      { key: 'store_id',           type: 'string',  size: 36    },
      { key: 'category',           type: 'string',  size: 64    },
      { key: 'boost_until',        type: 'datetime' },
    ],
    indexes: [
      { key: 'idx_seller_id',   type: 'key', attributes: ['sellerId'],    orders: ['ASC']  },
      { key: 'idx_status',      type: 'key', attributes: ['status'],      orders: ['ASC']  },
      { key: 'idx_created_at',  type: 'key', attributes: ['$createdAt'],  orders: ['DESC'] },
    ],
  },
  {
    id: 'typing_indicators', name: 'Typing Indicators',
    attrs: [
      { key: 'sender_id',       type: 'string', size: 36, required: true },
      { key: 'sender_username', type: 'string', size: 64  },
      { key: 'receiver_username',type:'string', size: 64  },
    ],
    indexes: [],
  },
  {
    id: 'calls', name: 'Calls',
    attrs: [
      { key: 'caller_id',  type: 'string',  size: 36 },
      { key: 'callee_id',  type: 'string',  size: 36 },
      { key: 'status',     type: 'string',  size: 16, defaultValue: 'RINGING' },
      { key: 'type',       type: 'string',  size: 16, defaultValue: 'voice' },
      { key: 'started_at', type: 'datetime' },
      { key: 'ended_at',   type: 'datetime' },
      { key: 'duration',   type: 'integer', defaultValue: 0 },
      { key: 'channel_id', type: 'string',  size: 128 },
    ],
    indexes: [
      { key: 'idx_caller_id', type: 'key', attributes: ['caller_id'], orders: ['ASC'] },
      { key: 'idx_callee_id', type: 'key', attributes: ['callee_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'ai_conversations', name: 'AI Conversations',
    attrs: [
      { key: 'user_id',      type: 'string', size: 36,  required: true },
      { key: 'title',        type: 'string', size: 256  },
      { key: 'last_message', type: 'string', size: 200  },
      { key: 'created_at',   type: 'string', size: 64   },
      { key: 'updated_at',   type: 'string', size: 64   },
      { key: 'expires_at',   type: 'string', size: 64   },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'ai_messages', name: 'AI Messages',
    attrs: [
      { key: 'conversation_id', type: 'string', size: 36,   required: true },
      { key: 'user_id',         type: 'string', size: 36    },
      { key: 'role',            type: 'string', size: 16    },
      { key: 'content',         type: 'string', size: 16000 },
      { key: 'created_at',      type: 'string', size: 64    },
    ],
    indexes: [
      { key: 'idx_conversation_id', type: 'key', attributes: ['conversation_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'admin_reports', name: 'Admin Reports',
    attrs: [
      { key: 'reporter_id',   type: 'string', size: 36  },
      { key: 'content_id',    type: 'string', size: 36  },
      { key: 'content_type',  type: 'string', size: 32  },
      { key: 'reason',        type: 'string', size: 256  },
      { key: 'status',        type: 'string', size: 16, defaultValue: 'PENDING' },
      { key: 'reviewed_by',   type: 'string', size: 36  },
    ],
    indexes: [
      { key: 'idx_status', type: 'key', attributes: ['status'], orders: ['ASC'] },
    ],
  },
  {
    id: 'sounds', name: 'Sounds',
    attrs: [
      { key: 'user_id',    type: 'string',  size: 36,  required: true },
      { key: 'title',      type: 'string',  size: 256  },
      { key: 'file_id',    type: 'string',  size: 36   },
      { key: 'duration',   type: 'integer', defaultValue: 0 },
      { key: 'uses_count', type: 'integer', defaultValue: 0 },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'reel_drafts', name: 'Reel Drafts',
    attrs: [
      { key: 'user_id',  type: 'string', size: 36,   required: true },
      { key: 'video_id', type: 'string', size: 36    },
      { key: 'caption',  type: 'string', size: 2000  },
      { key: 'audio_id', type: 'string', size: 36    },
      { key: 'status',   type: 'string', size: 16,   defaultValue: 'draft' },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'stores', name: 'Stores',
    attrs: [
      { key: 'owner_id',       type: 'string',   size: 36,   required: true },
      { key: 'owner_username', type: 'string',   size: 64    },
      { key: 'store_name',     type: 'string',   size: 128,  required: true },
      { key: 'logo_file_id',   type: 'string',   size: 36    },
      { key: 'description',    type: 'string',   size: 2000, required: true },
      { key: 'motto',          type: 'string',   size: 256   },
      { key: 'category',       type: 'string',   size: 64,   required: true },
      { key: 'is_active',      type: 'boolean',  defaultValue: true },
      { key: 'boost_until',    type: 'datetime'  },
    ],
    indexes: [
      { key: 'idx_owner_id', type: 'key', attributes: ['owner_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'music_unlocks', name: 'Music Unlocks',
    attrs: [
      { key: 'user_id',      type: 'string', size: 36, required: true },
      { key: 'track_id',     type: 'string', size: 36, required: true },
      { key: 'price_paid',   type: 'float',  required: true },
      { key: 'artist_id',    type: 'string', size: 36  },
      { key: 'artist_amount',type: 'float'   },
    ],
    indexes: [
      { key: 'idx_user_track', type: 'key', attributes: ['user_id', 'track_id'], orders: ['ASC', 'ASC'] },
    ],
  },
  {
    id: 'security_events', name: 'Security Events',
    attrs: [
      { key: 'user_id',    type: 'string', size: 64,   },
      { key: 'event_type', type: 'string', size: 64,   required: true },
      { key: 'severity',   type: 'string', size: 16,   defaultValue: 'INFO' },
      { key: 'ip_address', type: 'string', size: 64    },
      { key: 'endpoint',   type: 'string', size: 256   },
      { key: 'method',     type: 'string', size: 16    },
      { key: 'user_agent', type: 'string', size: 512   },
      { key: 'details',    type: 'string', size: 4000  },
      { key: 'actor_id',   type: 'string', size: 64    },
      { key: 'actor_role', type: 'string', size: 32    },
      { key: 'target_id',  type: 'string', size: 64    },
      { key: 'amount',     type: 'string', size: 32    },
      { key: 'currency',   type: 'string', size: 16    },
      { key: 'result',     type: 'string', size: 16,   defaultValue: 'success' },
    ],
    indexes: [
      { key: 'idx_user_id',    type: 'key', attributes: ['user_id'],    orders: ['ASC']  },
      { key: 'idx_event_type', type: 'key', attributes: ['event_type'], orders: ['ASC']  },
      { key: 'idx_severity',   type: 'key', attributes: ['severity'],   orders: ['ASC']  },
      { key: 'idx_created_at', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
    ],
  },
  {
    id: 'user_activity', name: 'User Activity',
    attrs: [
      { key: 'user_id',      type: 'string',   size: 36,  required: true },
      { key: 'username',     type: 'string',   size: 64   },
      { key: 'ip_address',   type: 'string',   size: 64   },
      { key: 'user_agent',   type: 'string',   size: 512  },
      { key: 'session_date', type: 'string',   size: 32   },
      { key: 'last_seen',    type: 'datetime'  },
    ],
    indexes: [
      { key: 'idx_user_session', type: 'key', attributes: ['user_id', 'session_date'], orders: ['ASC', 'ASC'] },
    ],
  },
  {
    id: 'push_subscriptions', name: 'Push Subscriptions',
    attrs: [
      { key: 'endpoint',        type: 'string', size: 2048, required: true },
      { key: 'p256dh',          type: 'string', size: 256   },
      { key: 'auth',            type: 'string', size: 128   },
      { key: 'expiration_time', type: 'string', size: 64    },
      { key: 'user_id',         type: 'string', size: 36    },
      { key: 'updated_at',      type: 'string', size: 64    },
      { key: 'created_at',      type: 'string', size: 64    },
    ],
    indexes: [
      { key: 'idx_endpoint', type: 'key', attributes: ['endpoint'], orders: ['ASC'] },
      { key: 'idx_user_id',  type: 'key', attributes: ['user_id'],  orders: ['ASC'] },
    ],
  },
  // OAuth collections
  {
    id: 'oauth_clients', name: 'OAuth Clients',
    attrs: [
      { key: 'client_id',     type: 'string', size: 64,   required: true },
      { key: 'client_secret', type: 'string', size: 128   },
      { key: 'name',          type: 'string', size: 128   },
      { key: 'description',   type: 'string', size: 512   },
      { key: 'logo_url',      type: 'string', size: 512   },
      { key: 'website_url',   type: 'string', size: 512   },
      { key: 'redirect_uris', type: 'string', size: 512,  array: true },
      { key: 'owner_id',      type: 'string', size: 36    },
      { key: 'created_at',    type: 'string', size: 64    },
    ],
    indexes: [
      { key: 'idx_owner_id', type: 'key', attributes: ['owner_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'oauth_auth_codes', name: 'OAuth Auth Codes',
    attrs: [
      { key: 'client_id',    type: 'string', size: 64   },
      { key: 'user_id',      type: 'string', size: 36   },
      { key: 'scope',        type: 'string', size: 256  },
      { key: 'expires_at',   type: 'string', size: 64   },
      { key: 'redirect_uri', type: 'string', size: 512  },
    ],
    indexes: [],
  },
  {
    id: 'oauth_access_tokens', name: 'OAuth Access Tokens',
    attrs: [
      { key: 'client_id',  type: 'string', size: 64  },
      { key: 'user_id',    type: 'string', size: 36  },
      { key: 'scope',      type: 'string', size: 256 },
      { key: 'expires_at', type: 'string', size: 64  },
    ],
    indexes: [
      { key: 'idx_user_id', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    ],
  },
];

const BUCKETS = [
  { id: 'avatars',              name: 'Avatars'              },
  { id: 'covers',               name: 'Cover Photos'         },
  { id: 'post_media',           name: 'Post Media'           },
  { id: 'story_media',          name: 'Story Media'          },
  { id: 'reel_media',           name: 'Reel Media'           },
  { id: 'music_tracks',         name: 'Music Tracks'         },
  { id: 'album_covers',         name: 'Album Covers'         },
  { id: 'voice_messages',       name: 'Voice Messages'       },
  { id: 'payment_screenshots',  name: 'Payment Screenshots'  },
  { id: 'message_media',        name: 'Message Media'        },
  { id: 'event_flyers',         name: 'Event Flyers'         },
  { id: 'Marketplace_Images',   name: 'Marketplace Images'   },
  { id: 'store_logos',          name: 'Store Logos'          },
  { id: 'sounds',               name: 'Sounds'               },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀  ViMore Appwrite Provisioning`);
  console.log(`   Endpoint:  ${ENDPOINT}`);
  console.log(`   Project:   ${PROJECT_ID}`);
  console.log(`   Database:  ${DATABASE_ID}\n`);

  // 1. Database
  await ensureDatabase();

  // 2. Collections + attributes
  console.log('\n📂  Creating collections & attributes…');
  for (const col of COLLECTIONS) {
    await ensureCollection(col.id, col.name);
    await createAttrs(col.id, col.attrs);
  }

  // 3. Wait for all attributes to become available, then create indexes
  console.log('\n⏳  Waiting for attributes to become available…');
  await sleep(5000); // initial settle

  console.log('\n🔍  Creating indexes…');
  for (const col of COLLECTIONS) {
    if (!col.indexes || col.indexes.length === 0) continue;
    const attrKeys = col.attrs.map(a => a.key);
    await waitForAttrs(col.id, attrKeys);
    for (const idx of col.indexes) {
      await createIndex(col.id, idx.key, idx.type, idx.attributes, idx.orders);
      await sleep(100);
    }
    console.log(`  ✅  Indexes ready: ${col.id}`);
  }

  // 4. Storage buckets
  console.log('\n🗄️   Creating storage buckets…');
  for (const bucket of BUCKETS) {
    await ensureBucket(bucket.id, bucket.name);
    await sleep(200);
  }

  console.log('\n✅  Provisioning complete!\n');
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err?.message || err);
  process.exit(1);
});
