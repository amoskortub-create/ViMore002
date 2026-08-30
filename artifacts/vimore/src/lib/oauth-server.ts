import 'server-only';
import crypto from 'crypto';
import { getAdminDatabases, getAdminUsers, DATABASE_ID } from './appwrite-server';
import { ID } from 'node-appwrite';

export const OAUTH_COL = {
  CLIENTS:       'oauth_clients',
  AUTH_CODES:    'oauth_auth_codes',
  ACCESS_TOKENS: 'oauth_access_tokens',
};

export const SUPPORTED_SCOPES: Record<string, string> = {
  profile:      'Access your name, username, and profile picture',
  email:        'Access your email address',
  'read:posts': 'Read your public posts and activity',
};

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

// ─── Clients ──────────────────────────────────────────────────────────────────
// Document $id === client_id — allows direct getDocument() lookup, no index needed.

export async function createOAuthClient(data: {
  name: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  redirect_uris: string[];
  owner_id: string;
}) {
  const db = getAdminDatabases();
  const client_id = 'vimore_' + generateToken(8);        // 23 chars — safe as $id
  const client_secret_raw = generateToken(24);
  const client_secret_hash = hashSecret(client_secret_raw);

  await db.createDocument(DATABASE_ID, OAUTH_COL.CLIENTS, client_id, {
    client_id,
    client_secret: client_secret_hash,
    name: data.name,
    description: data.description || '',
    logo_url: data.logo_url || '',
    website_url: data.website_url || '',
    redirect_uris: data.redirect_uris,
    owner_id: data.owner_id,
    created_at: new Date().toISOString(),
  });

  return { client_id, client_secret: client_secret_raw };
}

export async function getOAuthClient(client_id: string) {
  const db = getAdminDatabases();
  try {
    // $id === client_id, so no query or index needed
    return await db.getDocument(DATABASE_ID, OAUTH_COL.CLIENTS, client_id);
  } catch {
    return null;
  }
}

export async function listOAuthClients(owner_id: string) {
  const db = getAdminDatabases();
  try {
    // Fetch all and filter client-side — no index required
    const res = await db.listDocuments(DATABASE_ID, OAUTH_COL.CLIENTS, []);
    return res.documents.filter((d: any) => d.owner_id === owner_id);
  } catch {
    return [];
  }
}

export async function deleteOAuthClient(client_id: string, owner_id: string) {
  const db = getAdminDatabases();
  // Direct lookup by $id — no query needed
  const doc = await db.getDocument(DATABASE_ID, OAUTH_COL.CLIENTS, client_id);
  if (doc.owner_id !== owner_id) throw new Error('Unauthorized');
  await db.deleteDocument(DATABASE_ID, OAUTH_COL.CLIENTS, client_id);
}

// ─── Auth Codes ───────────────────────────────────────────────────────────────
// Document $id === code — allows direct getDocument() lookup, no index needed.
// generateToken(16) = 32 hex chars, safely within Appwrite's 36-char $id limit.

export async function createAuthCode(data: {
  client_id: string;
  user_id: string;
  scopes: string;
  redirect_uri: string;
}) {
  const db = getAdminDatabases();
  const code = generateToken(16);                         // 32 chars — safe as $id
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db.createDocument(DATABASE_ID, OAUTH_COL.AUTH_CODES, code, {
    code,
    client_id: data.client_id,
    user_id: data.user_id,
    scopes: data.scopes,
    redirect_uri: data.redirect_uri,
    expires_at,
    used: false,
  });

  return code;
}

export async function exchangeAuthCode(
  code: string,
  client_id: string,
  redirect_uri: string,
  client_secret: string,
) {
  const db = getAdminDatabases();

  const client = await getOAuthClient(client_id);
  if (!client) return { error: 'invalid_client' };
  if (client.client_secret !== hashSecret(client_secret)) return { error: 'invalid_client' };

  // $id === code — direct lookup, no query needed
  let doc: any;
  try {
    doc = await db.getDocument(DATABASE_ID, OAUTH_COL.AUTH_CODES, code);
  } catch {
    return { error: 'invalid_grant' };
  }

  if (doc.client_id !== client_id)        return { error: 'invalid_grant' };
  if (doc.used)                            return { error: 'invalid_grant' };
  if (new Date(doc.expires_at) < new Date()) return { error: 'invalid_grant' };
  if (doc.redirect_uri !== redirect_uri)  return { error: 'invalid_grant' };

  await db.updateDocument(DATABASE_ID, OAUTH_COL.AUTH_CODES, code, { used: true });

  const token = generateToken(16);                        // 32 chars — safe as $id
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.createDocument(DATABASE_ID, OAUTH_COL.ACCESS_TOKENS, token, {
    token,
    client_id,
    user_id: doc.user_id,
    scopes: doc.scopes,
    expires_at,
    revoked: false,
  });

  return { token, user_id: doc.user_id, scopes: doc.scopes, expires_at };
}

// ─── Access Tokens ────────────────────────────────────────────────────────────
// Document $id === token — allows direct getDocument() lookup, no index needed.

export async function verifyAccessToken(token: string) {
  const db = getAdminDatabases();
  try {
    // $id === token — direct lookup, no query needed
    const doc = await db.getDocument(DATABASE_ID, OAUTH_COL.ACCESS_TOKENS, token);
    if (doc.revoked) return null;
    if (new Date(doc.expires_at) < new Date()) return null;
    return {
      user_id:   doc.user_id as string,
      scopes:    doc.scopes as string,
      client_id: doc.client_id as string,
    };
  } catch {
    return null;
  }
}

export async function revokeAccessToken(token: string) {
  const db = getAdminDatabases();
  try {
    // $id === token — direct update, no query needed
    await db.updateDocument(DATABASE_ID, OAUTH_COL.ACCESS_TOKENS, token, { revoked: true });
  } catch {}
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(user_id: string) {
  const db = getAdminDatabases();
  try {
    // Direct lookup by $id in the users collection
    return await db.getDocument(DATABASE_ID, 'users', user_id);
  } catch {
    try {
      const users = getAdminUsers();
      return await users.get(user_id);
    } catch {
      return null;
    }
  }
}
