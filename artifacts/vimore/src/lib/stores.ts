import { databases, storage, ID, Query, COL, BUCKET, DATABASE_ID, getFilePreview } from './appwrite';
import { Permission, Role } from 'appwrite';

export const STORE_BOOST_DIAMONDS_PER_DAY = 3;
export const STORE_BOOST_MAX_DAYS = 30;

export const STORE_CATEGORIES = [
  'Fashion & Clothing',
  'Electronics & Gadgets',
  'Food & Drinks',
  'Beauty & Health',
  'Home & Living',
  'Services',
  'Farming & Agriculture',
  'Books & Education',
  'Sports & Fitness',
  'Art & Crafts',
  'Other',
] as const;

export type StoreCategory = typeof STORE_CATEGORIES[number];

export interface StoreDoc {
  $id: string;
  $createdAt: string;
  owner_id: string;
  owner_username: string;
  store_name: string;
  logo_file_id: string | null;
  description: string;
  motto: string;
  category: StoreCategory;
  is_active: boolean;
  boost_until: string | null;
}

export interface CreateStoreInput {
  owner_id: string;
  owner_username: string;
  store_name: string;
  logo_file?: File | null;
  description: string;
  motto: string;
  category: StoreCategory;
}

export interface UpdateStoreInput {
  store_name?: string;
  logo_file?: File | null;
  description?: string;
  motto?: string;
  category?: StoreCategory;
}

function mapStore(doc: any): StoreDoc {
  return {
    $id: doc.$id,
    $createdAt: doc.$createdAt,
    owner_id: doc.owner_id || '',
    owner_username: doc.owner_username || '',
    store_name: doc.store_name || '',
    logo_file_id: doc.logo_file_id || null,
    description: doc.description || '',
    motto: doc.motto || '',
    category: (doc.category || 'Other') as StoreCategory,
    is_active: doc.is_active !== false,
    boost_until: doc.boost_until || null,
  };
}

export function isStoreBoosted(store: StoreDoc): boolean {
  if (!store.boost_until) return false;
  return new Date(store.boost_until).getTime() > Date.now();
}

export function getStoreLogoUrl(fileId: string): string {
  if (!fileId) return '';
  return getFilePreview(BUCKET.STORE_LOGOS, fileId, { width: 256, height: 256, quality: 75, output: 'webp' });
}

export function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function slugToCategory(slug: string): StoreCategory | null {
  const found = STORE_CATEGORIES.find(c => categoryToSlug(c) === slug);
  return found || null;
}

async function uploadStoreLogo(file: File, _ownerId: string): Promise<string> {
  const { uploadViaClient } = await import('./upload');
  return uploadViaClient(file, BUCKET.STORE_LOGOS);
}

export async function getMyStore(userId: string): Promise<StoreDoc | null> {
  try {
    const res = await databases.listDocuments(DATABASE_ID, COL.STORES, [
      Query.equal('owner_id', userId),
      Query.limit(1),
    ]);
    if (res.documents.length === 0) return null;
    return mapStore(res.documents[0]);
  } catch {
    return null;
  }
}

export async function getStore(storeId: string): Promise<StoreDoc | null> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, COL.STORES, storeId);
    return mapStore(doc);
  } catch {
    return null;
  }
}

export async function listAllStores(limit = 200): Promise<StoreDoc[]> {
  try {
    const res = await databases.listDocuments(DATABASE_ID, COL.STORES, [
      Query.equal('is_active', true),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
    ]);
    return res.documents.map(mapStore);
  } catch {
    return [];
  }
}

export async function listStoresByCategory(category: StoreCategory, limit = 50): Promise<StoreDoc[]> {
  try {
    const res = await databases.listDocuments(DATABASE_ID, COL.STORES, [
      Query.equal('is_active', true),
      Query.equal('category', category),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
    ]);
    return res.documents.map(mapStore);
  } catch {
    return [];
  }
}

export async function createStore(input: CreateStoreInput): Promise<StoreDoc> {
  const existing = await getMyStore(input.owner_id);
  if (existing) throw new Error('You already have a store.');

  let logo_file_id: string | null = null;
  if (input.logo_file) {
    logo_file_id = await uploadStoreLogo(input.logo_file, input.owner_id);
  }

  try {
    const res = await fetch('/api/marketplace/create-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_id: input.owner_id,
        owner_username: input.owner_username,
        store_name: input.store_name,
        logo_file_id,
        description: input.description,
        motto: input.motto,
        category: input.category,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create store');
    return mapStore(data.store);
  } catch (err) {
    if (logo_file_id) {
      try { await storage.deleteFile(BUCKET.STORE_LOGOS, logo_file_id); } catch {}
    }
    throw err;
  }
}

export async function updateStore(storeId: string, ownerId: string, input: UpdateStoreInput, currentLogoFileId?: string | null): Promise<StoreDoc> {
  let logo_file_id = currentLogoFileId;

  if (input.logo_file) {
    const newId = await uploadStoreLogo(input.logo_file, ownerId);
    if (currentLogoFileId) {
      try { await storage.deleteFile(BUCKET.STORE_LOGOS, currentLogoFileId); } catch {}
    }
    logo_file_id = newId;
  }

  const data: Record<string, any> = { logo_file_id };
  if (input.store_name !== undefined) data.store_name = input.store_name.trim();
  if (input.description !== undefined) data.description = input.description.trim();
  if (input.motto !== undefined) data.motto = input.motto.trim();
  if (input.category !== undefined) data.category = input.category;

  const doc = await databases.updateDocument(DATABASE_ID, COL.STORES, storeId, data);
  return mapStore(doc);
}

export async function boostStoreWithDiamonds(
  storeId: string,
  ownerId: string,
  days: number,
  currentDiamondBalance: number,
): Promise<string> {
  if (days < 1 || days > STORE_BOOST_MAX_DAYS) throw new Error(`Boost must be 1–${STORE_BOOST_MAX_DAYS} days.`);
  const cost = days * STORE_BOOST_DIAMONDS_PER_DAY;
  if (currentDiamondBalance < cost) throw new Error(`You need ${cost} Credits but only have ${currentDiamondBalance}.`);

  const store = await getStore(storeId);
  if (!store) throw new Error('Store not found.');
  if (store.owner_id !== ownerId) throw new Error('Not your store.');

  const now = Date.now();
  const startMs = store.boost_until ? Math.max(now, new Date(store.boost_until).getTime()) : now;
  const newUntil = new Date(startMs + days * 24 * 60 * 60 * 1000).toISOString();

  await Promise.all([
    databases.updateDocument(DATABASE_ID, COL.STORES, storeId, { boost_until: newUntil }),
    databases.updateDocument(DATABASE_ID, COL.USERS, ownerId, {
      diamond_balance: currentDiamondBalance - cost,
    }),
    databases.createDocument(DATABASE_ID, COL.TRANSACTIONS, ID.unique(), {
      user_id: ownerId,
      type: 'STORE_BOOST',
      currency: 'DIAMOND',
      amount: -cost,
      description: `Store boost: ${days} day${days > 1 ? 's' : ''} for "${store.store_name}"`,
      status: 'completed',
    }, [Permission.read(Role.user(ownerId))]),
  ]);

  return newUntil;
}
