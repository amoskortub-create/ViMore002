---
name: authFetch — JWT bridge for server-side API routes
description: Why Appwrite sessions don't reach Next.js API routes and how authFetch fixes it
---

**The problem:** The Appwrite web SDK (v14) stores sessions in **localStorage** in browser environments (not cookies). It logs this as a console warning: "Appwrite is using localStorage for session management." As a result, `req.cookies.get('a_session_vimore123')` in Next.js API routes is always `undefined` — any route using `getSessionUser()` returns 401 for all logged-in users.

**The fix:** 
- `src/lib/auth-fetch.ts` — wrapper around `fetch` that calls `account.createJWT()` to get a 15-min JWT, caches it for 10 minutes, and adds `Authorization: Bearer <jwt>` to every request.
- `src/lib/session.ts` — updated to try JWT from `Authorization` header first (via `client.setJWT(jwt)`), falling back to cookie session.
- All PostContext server API calls (`/api/transaction/*`, `/api/payment/*`, `/api/admin/*`, `/api/withdraw`, `/api/user/profile`) now use `authFetch` instead of `fetch`.
- Admin page useEffects for `/api/admin/check` and verification routes also use `authFetch`.

**Why:** JWT is passed per-request so it works even with localStorage-only session storage.

**How to apply:** Any new Next.js API route that calls `getSessionUser()` will automatically work because `session.ts` reads the JWT from the Authorization header. Any new client-side code that calls a protected API route MUST use `authFetch` from `@/lib/auth-fetch`, not raw `fetch`.
