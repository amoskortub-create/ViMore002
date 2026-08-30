/**
 * authFetch — drop-in fetch wrapper that authenticates Next.js API calls.
 *
 * Why this exists:
 * The Appwrite web SDK v14 stores sessions in localStorage under the key
 * "cookieFallback" as a JSON object: { "a_session_{projectId}": "SESSION_VALUE" }.
 * It sends this to the Appwrite server as the "X-Fallback-Cookies" header.
 * But our Next.js API routes are on a DIFFERENT path/domain from the Appwrite
 * server, so req.cookies is always empty and JWT creation requires an extra
 * network round-trip that can fail.
 *
 * Solution: read the session value directly from localStorage and send it as
 * "X-Appwrite-Session" — a custom header our session.ts reads via client.setSession().
 * JWT is attempted in parallel as a secondary credential.
 */

const PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';

const COOKIE_KEY = 'cookieFallback';
const SESSION_KEY = `a_session_${PROJECT_ID}`;

/** Synchronously read the Appwrite session value from localStorage. */
export function getSessionFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.[SESSION_KEY] ?? null;
  } catch {
    return null;
  }
}

/** Attempt to create an Appwrite JWT (short-lived, 15 min). Cached 10 min. */
let _jwtCache: { token: string; exp: number } | null = null;
async function tryGetJwt(): Promise<string | null> {
  try {
    if (_jwtCache && Date.now() < _jwtCache.exp) return _jwtCache.token;
    // Lazy import to avoid loading appwrite module in server context
    const { account } = await import('./appwrite');
    const result = await account.createJWT();
    _jwtCache = { token: result.jwt, exp: Date.now() + 10 * 60 * 1000 };
    return result.jwt;
  } catch {
    _jwtCache = null;
    return null;
  }
}

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers as HeadersInit | undefined);

  // Primary: direct session from localStorage (synchronous, no network call needed)
  const session = getSessionFromStorage();
  if (session) {
    headers.set('X-Appwrite-Session', session);
  }

  // Secondary: Appwrite JWT via Authorization header (belt-and-suspenders)
  const jwt = await tryGetJwt();
  if (jwt) {
    headers.set('Authorization', `Bearer ${jwt}`);
  }

  return fetch(url, { ...options, headers });
}

/** Call on logout to clear the JWT cache. */
export function clearJwtCache() {
  _jwtCache = null;
}
