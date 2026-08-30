---
name: Appwrite 1.6 session cookie extraction
description: In Appwrite 1.6, server-to-server session creation returns an empty secret in the JSON body; the real session token is in Set-Cookie.
---

# Appwrite 1.6 Session Cookie Extraction

## The Rule
Do NOT read `data.secret` from the Appwrite session creation JSON response. In Appwrite 1.6, it is always an empty string `""` for server-to-server calls. The real session token is in the `Set-Cookie` response header.

## Why
Appwrite 1.6 changed how sessions work: the session secret is now delivered via `Set-Cookie: a_session_{projectId}=<base64>` rather than in the JSON body. The JSON `secret` field is only populated in older versions or when specific client headers are present. Sending `X-Appwrite-Response-Format: 1.0.0` header makes things worse — it suppresses the `Set-Cookie` header entirely.

## How to Apply
In any server-to-server Appwrite session creation call (`POST /account/sessions/email`):
1. Do NOT send `X-Appwrite-Response-Format: 1.0.0`
2. After the fetch, read the cookie:
   ```typescript
   function extractSessionCookie(setCookieHeader: string | null, projectId: string): string {
     if (!setCookieHeader) return '';
     const match = setCookieHeader.match(new RegExp(`a_session_${projectId}=([^;,\\s]+)`));
     return match ? decodeURIComponent(match[1]) : '';
   }
   const secret =
     (typeof data.secret === 'string' && data.secret) ||
     extractSessionCookie(res.headers.get('set-cookie'), PROJECT_ID);
   ```
3. Return `secret` to the client — it stores it in `localStorage.cookieFallback.a_session_{projectId}`
4. `authFetch` sends it as `X-Appwrite-Session` header
5. `session.ts` calls `client.setSession(secret)` — Appwrite validates it ✅

The cookie value is a base64-encoded JSON `{id, secret}`. Appwrite accepts the full base64 value as `X-Appwrite-Session` (confirmed via curl testing).

## Files Fixed
- `src/server/api-impl/root/auth/login.ts`
- `src/server/api-impl/root/auth/register.ts`
- `src/server/api-impl/admin/login.ts`
