import { Client, Databases, ID, Permission, Role } from 'node-appwrite';
import 'dotenv/config';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'vimoreprod';
const apiKey = process.env.APPWRITE_API_KEY;

if (!apiKey) {
  console.error('APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const gifts = [
  ['Blush Bloom', '🌷', 50, 'Love'], ['Sweet Heart', '💗', 60, 'Love'], ['Rose Aura', '🌹', 80, 'Love'], ['Love Letter', '💌', 90, 'Love'], ['Cupid Crown', '👑', 100, 'Love'],
  ['Hope Basket', '🧺', 120, 'Support'], ['Kindness Pack', '🤝', 140, 'Support'], ['Village Blessing', '🙏', 160, 'Support'], ['Power Boost', '⚡', 180, 'Support'], ['Helping Hand', '🫶', 200, 'Support'],
  ['Sunrise Petal', '🌼', 50, 'Nature'], ['Forest Calm', '🌿', 70, 'Nature'], ['Leaf Blessing', '🍃', 90, 'Nature'], ['Rainforest Glow', '🌴', 110, 'Nature'], ['Golden Horizon', '🌅', 150, 'Nature'],
  ['Market Feast', '🍲', 60, 'Food'], ['Palm Rice', '🍚', 80, 'Food'], ['Jolly Cake', '🎂', 100, 'Food'], ['Cocoa Joy', '🍫', 130, 'Food'], ['Feast Table', '🍽️', 170, 'Food'],
  ['Party Pop', '🎉', 70, 'Celebration'], ['Confetti Burst', '🎊', 100, 'Celebration'], ['Birthday Star', '⭐', 130, 'Celebration'], ['Victory Bell', '🔔', 160, 'Celebration'], ['Grand Finale', '🏆', 200, 'Celebration'],
  ['Street Beat', '🎵', 80, 'Music'], ['Studio Spark', '🎧', 100, 'Music'], ['Vibe Mix', '🎶', 120, 'Music'], ['Sound Wave', '🔊', 150, 'Music'], ['Live Stage', '🎤', 200, 'Music'],
  ['Travel Bag', '🧳', 90, 'Travel'], ['Airport Pass', '🎫', 110, 'Travel'], ['Coastline Escape', '🏖️', 150, 'Travel'], ['Sky Route', '✈️', 200, 'Travel'], ['Global Glow', '🌍', 250, 'Travel'],
  ['First Win', '🥇', 80, 'Achievement'], ['Momentum Star', '🌟', 120, 'Achievement'], ['Silver Goal', '🥈', 160, 'Achievement'], ['Champion Crown', '🏆', 220, 'Achievement'], ['Legend Medal', '🏅', 300, 'Achievement'],
  ['Hometown Pride', '🏡', 75, 'Community'], ['Community Cheer', '👏', 110, 'Community'], ['Neighborhood Lift', '🧡', 140, 'Community'], ['Unity Circle', '🤝', 190, 'Community'], ['Together Crown', '👨‍👩‍👧‍👦', 260, 'Community'],
  ['Peace Euphoria', '🕊️', 90, 'Wellness'], ['Calm Wave', '🌊', 120, 'Wellness'], ['Glow Ritual', '✨', 170, 'Wellness'], ['Mindful Crown', '👁️', 220, 'Wellness'], ['Luxury Calm', '💎', 500, 'Wellness'],
];

const schemas = [
  {
    id: 'creator_orange_money_accounts', name: 'Creator Orange Money Accounts',
    permissions: [Permission.read(Role.users())],
    attrs: [
      ['userId', 'string', { size: 36, required: true }], ['orangeMoneyNumber', 'string', { size: 20, required: true }], ['accountName', 'string', { size: 128, required: true }],
      ['isVerified', 'boolean', { required: true, defaultValue: false }], ['createdAt', 'datetime', { required: true }], ['updatedAt', 'datetime', { required: true }],
    ], indexes: [['userId', 'unique', ['userId']], ['orangeMoneyNumber', 'unique', ['orangeMoneyNumber']]],
  },
  {
    id: 'transactions', name: 'Transactions', permissions: [],
    attrs: [
      ['transactionId', 'string', { size: 36, required: true }], ['senderUserId', 'string', { size: 36, required: true }], ['receiverUserId', 'string', { size: 36, required: true }],
      ['transactionType', 'enum', { elements: ['gift', 'subscription', 'unlock_post', 'unlock_music'], required: true }], ['amountLD', 'integer', { required: true, min: 1 }],
      ['itemId', 'string', { size: 36 }], ['itemType', 'enum', { elements: ['post', 'music', 'gift_item'] }], ['orangeMoneyRef', 'string', { size: 128 }],
      ['status', 'enum', { elements: ['pending', 'completed', 'failed', 'cancelled'], required: true }], ['createdAt', 'datetime', { required: true }],
    ], indexes: [['transactionId', 'unique', ['transactionId']], ['senderUserId', 'key', ['senderUserId']], ['receiverUserId', 'key', ['receiverUserId']], ['transactionType', 'key', ['transactionType']], ['amountLD', 'key', ['amountLD']], ['status', 'key', ['status']], ['createdAt', 'key', ['createdAt']]],
  },
  {
    id: 'creator_earnings', name: 'Creator Earnings', permissions: [],
    attrs: [['userId', 'string', { size: 36, required: true }], ['totalEarningsLD', 'integer', { required: true, defaultValue: 0 }], ['giftsEarningsLD', 'integer', { required: true, defaultValue: 0 }], ['subscriptionsEarningsLD', 'integer', { required: true, defaultValue: 0 }], ['lockedPostsEarningsLD', 'integer', { required: true, defaultValue: 0 }], ['lockedMusicEarningsLD', 'integer', { required: true, defaultValue: 0 }], ['lastUpdated', 'datetime', { required: true }]], indexes: [['userId', 'unique', ['userId']]],
  },
  {
    id: 'locked_content', name: 'Locked Content', permissions: [],
    attrs: [['contentId', 'string', { size: 36, required: true }], ['creatorUserId', 'string', { size: 36, required: true }], ['contentType', 'enum', { elements: ['post', 'music'], required: true }], ['priceLD', 'integer', { required: true, min: 100, max: 500 }], ['isLocked', 'boolean', { required: true, defaultValue: true }], ['createdAt', 'datetime', { required: true }]], indexes: [['contentId', 'unique', ['contentId']], ['creatorUserId', 'key', ['creatorUserId']], ['contentType', 'key', ['contentType']], ['priceLD', 'key', ['priceLD']]],
  },
  {
    id: 'subscriptions', name: 'Subscriptions', permissions: [],
    attrs: [['subscriptionId', 'string', { size: 36, required: true }], ['subscriberUserId', 'string', { size: 36, required: true }], ['creatorUserId', 'string', { size: 36, required: true }], ['amountLD', 'integer', { required: true, min: 500, max: 500 }], ['startDate', 'datetime', { required: true }], ['endDate', 'datetime', { required: true }], ['isActive', 'boolean', { required: true, defaultValue: true }], ['autoRenew', 'boolean', { required: true, defaultValue: true }]], indexes: [['subscriptionId', 'unique', ['subscriptionId']], ['subscriberUserId', 'key', ['subscriberUserId']], ['creatorUserId', 'key', ['creatorUserId']], ['startDate', 'key', ['startDate']], ['endDate', 'key', ['endDate']], ['isActive', 'key', ['isActive']]],
  },
  {
    id: 'gift_items', name: 'Gift Items', permissions: [Permission.read(Role.users())],
    attrs: [['giftId', 'string', { size: 36, required: true }], ['name', 'string', { size: 128, required: true }], ['priceLD', 'integer', { required: true, min: 50, max: 500 }], ['category', 'string', { size: 64, required: true }], ['iconUrl', 'string', { size: 512, required: true }], ['isActive', 'boolean', { required: true, defaultValue: true }]], indexes: [['giftId', 'unique', ['giftId']], ['priceLD', 'key', ['priceLD']], ['category', 'key', ['category']]],
  },
];

async function createAttribute(collectionId, [key, type, options]) {
  try {
    const { size, required = false, defaultValue = null, min = null, max = null, elements } = options;
    if (type === 'string') await databases.createStringAttribute(databaseId, collectionId, key, size, required, defaultValue);
    if (type === 'integer') await databases.createIntegerAttribute(databaseId, collectionId, key, required, min, max, defaultValue);
    if (type === 'boolean') await databases.createBooleanAttribute(databaseId, collectionId, key, required, defaultValue);
    if (type === 'datetime') await databases.createDatetimeAttribute(databaseId, collectionId, key, required, defaultValue);
    if (type === 'enum') await databases.createEnumAttribute(databaseId, collectionId, key, elements, required, defaultValue);
  } catch (error) {
    if (error?.code !== 409) throw error;
  }
}

async function ensureSchema(schema) {
  try {
    await databases.createCollection(databaseId, schema.id, schema.name, schema.permissions, false, true);
    console.log(`Created collection ${schema.id}`);
  } catch (error) {
    if (error?.code !== 409) throw error;
  }
  for (const attribute of schema.attrs) {
    await createAttribute(schema.id, attribute);
    await sleep(100);
  }
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const collection = await databases.getCollection(databaseId, schema.id);
    if ((collection.attributes || []).every((attribute) => attribute.status === 'available')) break;
    await sleep(1500);
  }
  for (const [key, type, attributes] of schema.indexes) {
    try { await databases.createIndex(databaseId, schema.id, key, type, attributes); } catch (error) { if (error?.code !== 409) throw error; }
  }
}

async function seedGifts() {
  for (const [index, [name, icon, priceLD, category]] of gifts.entries()) {
    const giftId = `gift-${String(index + 1).padStart(2, '0')}`;
    try {
      await databases.createDocument(databaseId, 'gift_items', giftId, { giftId, name, priceLD, category, iconUrl: `emoji:${icon}`, isActive: true });
    } catch (error) { if (error?.code !== 409) throw error; }
  }
  console.log(`Seeded ${gifts.length} gift items`);
}

for (const schema of schemas) await ensureSchema(schema);
await seedGifts();
console.log('Appwrite monetization schema is ready');