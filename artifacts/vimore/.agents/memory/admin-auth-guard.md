---
name: Admin server-side auth guard
description: How the Command Core admin page validates admin role server-side to prevent bypass
---

The admin page (`src/app/admin/page.tsx`) now calls `/api/admin/check` on mount via a `useEffect` to validate the session server-side. Two state vars — `serverRoleChecked` (bool) and `serverAuthorized` (bool|null) — drive the `isUnauthorized` derived value.

**Why:** The old `isUnauthorized = userRole === 'USER'` used only the client-side context role, which could be stale or bypassed. Server check uses the Appwrite session cookie for ground truth.

**How to apply:** The `serverRoleChecked` and `serverAuthorized` useState calls MUST appear before the `isUnauthorized` const in the component body (not after), otherwise TypeScript TS2448/TS2454 errors occur. This was fixed by moving them to lines ~197-198.
