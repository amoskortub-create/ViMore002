/**
 * ViMore — Fix pass: re-create failed attributes, failed indexes, and buckets.
 */

import { Client, Databases, Storage } from 'node-appwrite';
import 'dotenv/config';

const ENDPOINT   = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT  || 'https://appwrite.mediatechliberia.online/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
const API_KEY    = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'vimoreprod';

if (!API_KEY) { console.error('❌  APPWRITE_API_KEY is not set'); process.exit(1); }

const client  = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db      = new Databases(client);
const storage = new Storage(client);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function safeCreate(fn) {
  try { await fn(); }
  catch (e) {
    if (e?.code === 409) return; // already exists
    console.error('  ❌ ', e?.message || e);
  }
}

// ─── Fix 1: Attributes that failed with "required + defaultValue" conflict ───
// Solution: make them NOT required (optional with default).
const FIXED_ATTRS = [
  // users
  { col: 'users', key: 'is_verified',            type: 'boolean', defaultValue: false },
  { col: 'users', key: 'has_ever_been_verified',  type: 'boolean', defaultValue: false },
  { col: 'users', key: 'followers_count',         type: 'integer', defaultValue: 0 },
  { col: 'users', key: 'following_count',         type: 'integer', defaultValue: 0 },
  { col: 'users', key: 'friends_count',           type: 'integer', defaultValue: 0 },
  { col: 'users', key: 'posts_count',             type: 'integer', defaultValue: 0 },
  { col: 'users', key: 'gold_balance',            type: 'float',   defaultValue: 0 },
  { col: 'users', key: 'diamond_balance',         type: 'float',   defaultValue: 0 },
  { col: 'users', key: 'star_balance',            type: 'float',   defaultValue: 0 },
  { col: 'users', key: 'role',                    type: 'string',  size: 32, defaultValue: 'USER' },
  // posts
  { col: 'posts', key: 'likes_count',             type: 'integer', defaultValue: 0 },
  { col: 'posts', key: 'unlikes_count',           type: 'integer', defaultValue: 0 },
  { col: 'posts', key: 'comments_count',          type: 'integer', defaultValue: 0 },
  { col: 'posts', key: 'shares_count',            type: 'integer', defaultValue: 0 },
  { col: 'posts', key: 'views_count',             type: 'integer', defaultValue: 0 },
  { col: 'posts', key: 'is_locked',               type: 'boolean', defaultValue: false },
  { col: 'posts', key: 'is_boosted',              type: 'boolean', defaultValue: false },
  { col: 'posts', key: 'comments_disabled',       type: 'boolean', defaultValue: false },
  // posts.shared_post_data hit the attribute limit — reduce to 4000
  { col: 'posts', key: 'shared_post_data',        type: 'string',  size: 4000 },
  // ai_messages.content hit limit — reduce to 4000
  { col: 'ai_messages', key: 'content',           type: 'string',  size: 4000 },
];

async function createFixedAttr(a) {
  await safeCreate(async () => {
    switch (a.type) {
      case 'string':
        await db.createStringAttribute(DATABASE_ID, a.col, a.key, a.size || 255, false, a.defaultValue ?? null, false);
        break;
      case 'integer':
        await db.createIntegerAttribute(DATABASE_ID, a.col, a.key, false, null, null, a.defaultValue ?? null, false);
        break;
      case 'float':
        await db.createFloatAttribute(DATABASE_ID, a.col, a.key, false, null, null, a.defaultValue ?? null, false);
        break;
      case 'boolean':
        await db.createBooleanAttribute(DATABASE_ID, a.col, a.key, false, a.defaultValue ?? null, false);
        break;
    }
    console.log(`  ✅  Attr ${a.col}.${a.key}`);
  });
}

// ─── Fix 2: Indexes that failed (attrs weren't ready) ──────────────────────
const FIXED_INDEXES = [
  { col: 'users', key: 'idx_role',            type: 'key', attributes: ['role'],            orders: ['ASC']  },
  { col: 'users', key: 'idx_followers_count', type: 'key', attributes: ['followers_count'], orders: ['DESC'] },
  { col: 'posts', key: 'idx_is_boosted',      type: 'key', attributes: ['is_boosted'],      orders: ['ASC']  },
];

async function waitForAttr(col, key, maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const c = await db.getCollection(DATABASE_ID, col);
    const a = (c.attributes || []).find(x => x.key === key);
    if (a && a.status === 'available') return true;
    await sleep(1500);
  }
  return false;
}

// ─── Buckets ────────────────────────────────────────────────────────────────
const BUCKETS = [
  { id: 'avatars',             name: 'Avatars'             },
  { id: 'covers',              name: 'Cover Photos'        },
  { id: 'post_media',          name: 'Post Media'          },
  { id: 'story_media',         name: 'Story Media'         },
  { id: 'reel_media',          name: 'Reel Media'          },
  { id: 'music_tracks',        name: 'Music Tracks'        },
  { id: 'album_covers',        name: 'Album Covers'        },
  { id: 'voice_messages',      name: 'Voice Messages'      },
  { id: 'payment_screenshots', name: 'Payment Screenshots' },
  { id: 'message_media',       name: 'Message Media'       },
  { id: 'event_flyers',        name: 'Event Flyers'        },
  { id: 'Marketplace_Images',  name: 'Marketplace Images'  },
  { id: 'store_logos',         name: 'Store Logos'         },
  { id: 'sounds',              name: 'Sounds'              },
];

async function ensureBucket(id, name) {
  await safeCreate(async () => {
    await storage.createBucket(
      id, name,
      undefined, // permissions
      undefined, // fileSecurity
      true,      // enabled
      undefined, // maxFileSize
      ['jpg','jpeg','png','webp','gif','mp4','mov','mp3','ogg','wav','pdf','heic','m4a']
    );
    console.log(`  ✅  Bucket: ${id}`);
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔧  ViMore Fix Pass\n');

  console.log('1️⃣   Re-creating failed attributes…');
  for (const a of FIXED_ATTRS) {
    await createFixedAttr(a);
    await sleep(300);
  }

  console.log('\n2️⃣   Waiting for fixed attributes then creating indexes…');
  await sleep(4000);
  for (const idx of FIXED_INDEXES) {
    const ready = await waitForAttr(idx.col, idx.attributes[0]);
    if (!ready) { console.warn(`  ⚠️  Attr ${idx.col}.${idx.attributes[0]} still not ready, skipping index`); continue; }
    await safeCreate(async () => {
      await db.createIndex(DATABASE_ID, idx.col, idx.key, idx.type, idx.attributes, idx.orders);
      console.log(`  ✅  Index ${idx.col}.${idx.key}`);
    });
    await sleep(300);
  }

  console.log('\n3️⃣   Creating storage buckets…');
  for (const b of BUCKETS) {
    await ensureBucket(b.id, b.name);
    await sleep(300);
  }

  console.log('\n✅  Fix pass complete!\n');
}

main().catch(e => { console.error('❌  Fatal:', e?.message || e); process.exit(1); });
