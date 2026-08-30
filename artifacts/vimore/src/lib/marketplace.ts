import { databases, storage, account, ID, Query, COL, BUCKET, DATABASE_ID, getFilePreview, getFileUrl } from './appwrite';
import { Permission, Role } from 'appwrite';

export type ProductCurrency = 'LRD' | 'USD';
export type ProductStatus = 'active' | 'sold' | 'paused';

export interface ProductDoc {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  sellerId: string;
  sellerName: string;
  sellerUsername: string;
  sellerAvatarFileId?: string | null;
  name: string;
  description: string;
  priceAmount: number;
  priceCurrency: ProductCurrency;
  location: string;
  phoneNumber: string;
  imageFileIds: string[];
  status: ProductStatus;
  featuredUntil?: string | null;
  store_id?: string | null;
  category?: string | null;
}

export const BOOST_DAYS_PER_DIAMOND = 5;
export const BOOST_MIN_DIAMONDS = 2;
export const BOOST_MAX_DIAMONDS = 10;

export interface CreateProductInput {
  sellerId: string;
  sellerName: string;
  sellerUsername: string;
  sellerAvatarFileId?: string | null;
  name: string;
  description: string;
  priceAmount: number;
  priceCurrency: ProductCurrency;
  location: string;
  phoneNumber: string;
  files: File[];
  store_id?: string | null;
  category?: string | null;
}


export function normalizePhoneE164(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('231')) return '+' + digits;
  if (digits.startsWith('0')) return '+231' + digits.slice(1);
  return '+231' + digits;
}

export function digitsOnly(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

export async function compressImage(file: File, maxEdge = 1024, quality = 0.7): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const longest = Math.max(img.width, img.height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality)
  );
  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

export async function uploadProductImage(file: File, _sellerId: string): Promise<string> {
  const compressed = await compressImage(file);
  const { uploadViaClient } = await import('./upload');
  return uploadViaClient(compressed, BUCKET.MARKETPLACE_IMAGES);
}

function mapProduct(doc: any): ProductDoc {
  return {
    $id: doc.$id,
    $createdAt: doc.$createdAt,
    $updatedAt: doc.$updatedAt,
    sellerId: doc.sellerId || '',
    sellerName: doc.sellerName || '',
    sellerUsername: doc.sellerUsername || '',
    sellerAvatarFileId: doc.sellerAvatarFileId || null,
    name: doc.name || '',
    description: doc.description || '',
    priceAmount: typeof doc.priceAmount === 'number' ? doc.priceAmount : Number(doc.priceAmount) || 0,
    priceCurrency: (doc.priceCurrency || 'LRD') as ProductCurrency,
    location: doc.location || '',
    phoneNumber: doc.phoneNumber || '',
    imageFileIds: Array.isArray(doc.imageFileIds) ? doc.imageFileIds : [],
    status: (doc.status || 'active') as ProductStatus,
    featuredUntil: doc.featuredUntil || null,
    store_id: doc.store_id || null,
    category: doc.category || null,
  };
}

export function isFeatured(p: ProductDoc): boolean {
  if (!p.featuredUntil) return false;
  return new Date(p.featuredUntil).getTime() > Date.now();
}

export async function boostProductFeatured(productId: string, diamonds: number): Promise<string> {
  if (diamonds < BOOST_MIN_DIAMONDS || diamonds > BOOST_MAX_DIAMONDS) {
    throw new Error(`Boost must be between ${BOOST_MIN_DIAMONDS} and ${BOOST_MAX_DIAMONDS} Credits.`);
  }
  const days = diamonds * BOOST_DAYS_PER_DIAMOND;
  const existing = await getProduct(productId);
  const now = Date.now();
  const startMs = existing?.featuredUntil ? Math.max(now, new Date(existing.featuredUntil).getTime()) : now;
  const newUntil = new Date(startMs + days * 24 * 60 * 60 * 1000).toISOString();
  await databases.updateDocument(DATABASE_ID, COL.PRODUCTS, productId, { featuredUntil: newUntil });
  return newUntil;
}

export async function listProducts(opts: { limit?: number; cursorAfter?: string } = {}): Promise<ProductDoc[]> {
  const queries: any[] = [
    Query.orderDesc('$createdAt'),
    Query.limit(opts.limit ?? 100),
  ];
  if (opts.cursorAfter) queries.push(Query.cursorAfter(opts.cursorAfter));
  const res = await databases.listDocuments(DATABASE_ID, COL.PRODUCTS, queries);
  return res.documents.map(mapProduct);
}

export async function listProductsBySeller(sellerId: string, limit = 50): Promise<ProductDoc[]> {
  try {
    const res = await databases.listDocuments(DATABASE_ID, COL.PRODUCTS, [
      Query.equal('sellerId', sellerId),
      Query.equal('status', 'active'),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
    ]);
    return res.documents.map(mapProduct);
  } catch {
    return [];
  }
}

export async function getProduct(productId: string): Promise<ProductDoc | null> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, COL.PRODUCTS, productId);
    return mapProduct(doc);
  } catch {
    return null;
  }
}

export async function createProduct(input: CreateProductInput): Promise<ProductDoc> {
  if (input.files.length < 1) throw new Error('At least one photo is required.');
  if (input.files.length > 2) throw new Error('You can upload a maximum of 2 photos.');

  const uploadedFileIds: string[] = [];
  try {
    for (const f of input.files) {
      const id = await uploadProductImage(f, input.sellerId);
      uploadedFileIds.push(id);
    }

    const doc = await databases.createDocument(
      DATABASE_ID,
      COL.PRODUCTS,
      ID.unique(),
      {
        sellerId: input.sellerId,
        sellerName: input.sellerName,
        sellerUsername: input.sellerUsername,
        sellerAvatarFileId: input.sellerAvatarFileId || null,
        name: input.name,
        description: input.description,
        priceAmount: input.priceAmount,
        priceCurrency: input.priceCurrency,
        location: input.location,
        phoneNumber: input.phoneNumber,
        imageFileIds: uploadedFileIds,
        status: 'active' as ProductStatus,
        store_id: input.store_id || null,
        category: input.category || null,
      },
      [
        Permission.read(Role.any()),
        Permission.update(Role.user(input.sellerId)),
        Permission.delete(Role.user(input.sellerId)),
      ]
    );
    return mapProduct(doc);
  } catch (err) {
    for (const id of uploadedFileIds) {
      try { await storage.deleteFile(BUCKET.MARKETPLACE_IMAGES, id); } catch { /* ignore */ }
    }
    throw err;
  }
}

export async function updateProductStatus(productId: string, status: ProductStatus): Promise<void> {
  await databases.updateDocument(DATABASE_ID, COL.PRODUCTS, productId, { status });
}

export async function deleteProduct(productId: string): Promise<void> {
  const doc = await getProduct(productId);
  if (!doc) return;
  for (const fileId of doc.imageFileIds) {
    try { await storage.deleteFile(BUCKET.MARKETPLACE_IMAGES, fileId); } catch { /* ignore */ }
  }
  await databases.deleteDocument(DATABASE_ID, COL.PRODUCTS, productId);
}

export function getProductImageUrl(fileId: string, size: 'thumb' | 'detail' = 'thumb'): string {
  if (!fileId) return '';
  if (size === 'thumb') {
    return getFilePreview(BUCKET.MARKETPLACE_IMAGES, fileId, { width: 320, height: 320, quality: 60, output: 'webp' });
  }
  return getFilePreview(BUCKET.MARKETPLACE_IMAGES, fileId, { width: 800, quality: 75, output: 'webp' });
}

export function getProductOriginalUrl(fileId: string): string {
  return getFileUrl(BUCKET.MARKETPLACE_IMAGES, fileId);
}

export function formatPrice(amount: number, currency: ProductCurrency): string {
  const formatted = amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return currency === 'USD' ? `$${formatted}` : `L$${formatted}`;
}

export function whatsappLink(phone: string, productName: string): string {
  const num = digitsOnly(phone);
  const msg = encodeURIComponent(`I am interested in your ${productName} on ViMore.`);
  return `https://wa.me/${num}?text=${msg}`;
}

export function telLink(phone: string): string {
  return `tel:${phone}`;
}
