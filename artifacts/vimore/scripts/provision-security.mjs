/**
 * Provisions the security_events collection + Appwrite Functions
 * for all transaction and admin actions.
 * Run: node scripts/provision-security.mjs
 */
import { Client, Databases, Functions, IndexType, Runtime } from 'node-appwrite';

const ENDPOINT   = 'https://mediatechliberia.online/v1';
const PROJECT_ID = 'vimore123';
const DB_ID      = 'vimoreprod';
const COLL_ID    = 'security_events';
const API_KEY    = process.env.APPWRITE_API_KEY;

if (!API_KEY) { console.error('APPWRITE_API_KEY not set'); process.exit(1); }

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db     = new Databases(client);
const fns    = new Functions(client);

// ─── helpers ────────────────────────────────────────────────────────────────
async function tryCreate(label, fn) {
  try {
    const result = await fn();
    console.log(`  ✓ ${label}`);
    return result;
  } catch (e) {
    if (e.code === 409) {
      console.log(`  ↩ ${label} (already exists)`);
    } else {
      console.error(`  ✗ ${label}: ${e.message}`);
    }
  }
}

// ─── 1. Collection ───────────────────────────────────────────────────────────
console.log('\n[ security_events collection ]');
await tryCreate('collection', () =>
  db.createCollection(DB_ID, COLL_ID, 'security_events', [
    'read("any")',
  ], false)
);

// ─── 2. Attributes ───────────────────────────────────────────────────────────
console.log('\n[ attributes ]');
const attrs = [
  () => db.createStringAttribute(DB_ID, COLL_ID, 'user_id',    64,  false, null),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'event_type', 64,  true,  null),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'severity',   16,  true,  'INFO'),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'ip_address', 64,  false, null),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'endpoint',   256, false, null),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'method',     16,  false, null),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'user_agent', 512, false, null),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'details',    4000,false, null),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'actor_id',   64,  false, null),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'actor_role', 32,  false, null),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'target_id',  64,  false, null),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'amount',     32,  false, null),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'currency',   16,  false, null),
  () => db.createStringAttribute(DB_ID, COLL_ID, 'result',     16,  false, 'success'),
];

const labels = [
  'user_id','event_type','severity','ip_address','endpoint','method',
  'user_agent','details','actor_id','actor_role','target_id','amount','currency','result'
];

for (let i = 0; i < attrs.length; i++) {
  await tryCreate(labels[i], attrs[i]);
  // Appwrite needs a moment between attribute creates to avoid conflicts
  await new Promise(r => setTimeout(r, 400));
}

// ─── 3. Indexes ──────────────────────────────────────────────────────────────
console.log('\n[ indexes ]');
// Wait for attributes to be ready
await new Promise(r => setTimeout(r, 3000));

await tryCreate('idx_user_id',    () => db.createIndex(DB_ID, COLL_ID, 'idx_user_id',    IndexType.Key,      ['user_id'],     ['ASC']));
await new Promise(r => setTimeout(r, 600));
await tryCreate('idx_event_type', () => db.createIndex(DB_ID, COLL_ID, 'idx_event_type', IndexType.Key,      ['event_type'],  ['ASC']));
await new Promise(r => setTimeout(r, 600));
await tryCreate('idx_severity',   () => db.createIndex(DB_ID, COLL_ID, 'idx_severity',   IndexType.Key,      ['severity'],    ['ASC']));
await new Promise(r => setTimeout(r, 600));
await tryCreate('idx_actor_id',   () => db.createIndex(DB_ID, COLL_ID, 'idx_actor_id',   IndexType.Key,      ['actor_id'],    ['ASC']));
await new Promise(r => setTimeout(r, 600));
await tryCreate('idx_created_at', () => db.createIndex(DB_ID, COLL_ID, 'idx_created_at', IndexType.Key,      ['$createdAt'],  ['DESC']));
await new Promise(r => setTimeout(r, 600));
await tryCreate('idx_result',     () => db.createIndex(DB_ID, COLL_ID, 'idx_result',     IndexType.Key,      ['result'],      ['ASC']));

// ─── 4. Appwrite Functions ───────────────────────────────────────────────────
console.log('\n[ Appwrite Functions ]');

const FUNCTIONS = [
  {
    functionId: 'fn-gift-transaction',
    name:       'Gift Transaction',
    entrypoint: 'src/functions/gift-transaction/index.js',
    execute:    ['users'],
    events:     [],
    schedule:   '',
    timeout:    15,
  },
  {
    functionId: 'fn-subscribe-transaction',
    name:       'Subscribe Transaction',
    entrypoint: 'src/functions/subscribe-transaction/index.js',
    execute:    ['users'],
    events:     [],
    schedule:   '',
    timeout:    15,
  },
  {
    functionId: 'fn-unlock-post-transaction',
    name:       'Unlock Post Transaction',
    entrypoint: 'src/functions/unlock-post-transaction/index.js',
    execute:    ['users'],
    events:     [],
    schedule:   '',
    timeout:    15,
  },
  {
    functionId: 'fn-admin-action-log',
    name:       'Admin Action Logger',
    entrypoint: 'src/functions/admin-action-log/index.js',
    execute:    ['users'],
    events:     [],
    schedule:   '',
    timeout:    10,
  },
];

for (const f of FUNCTIONS) {
  await tryCreate(`function: ${f.name}`, () =>
    fns.create(
      f.functionId,
      f.name,
      Runtime.Node185,
      f.execute,
      f.events,
      f.schedule,
      f.timeout,
    )
  );
  await new Promise(r => setTimeout(r, 600));
}

console.log('\n✅ Provisioning complete.\n');
