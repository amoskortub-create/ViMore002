---
name: API route consolidation for Vercel Hobby function cap
description: Why API endpoints live in src/server/api-impl/ and are dispatched through 3 catch-all route.ts files instead of one route.ts per endpoint
---

Vercel's Hobby plan caps a project at 12 Serverless Functions. Each `route.ts` file under `src/app/api/` becomes its own function, so a many-endpoint Next.js API can easily blow the cap as it grows.

**Why:** ViMore's build started failing on Vercel once it had 51 separate `route.ts` files, exceeding the 12-function limit. The user rejected upgrading to Pro or moving off Vercel, choosing to consolidate instead.

**How to apply:** All endpoint logic lives in plain (non-route) modules under `src/server/api-impl/{admin,oauth,root}/...`, mirroring the original API path structure. Three catch-all dispatcher files (`src/app/api/[...path]/route.ts`, `src/app/api/admin/[...path]/route.ts`, `src/app/api/oauth/[...path]/route.ts`) each hold a `ROUTES` map from path-key to handler module, and forward `GET/POST/PUT/DELETE/PATCH` to whichever handler matches. Next.js route specificity means `/api/admin/*` and `/api/oauth/*` hit their own dispatcher before falling through to the root catch-all. Dynamic-segment routes (e.g. a `[bucket]/[fileId]` file route) need a special-cased branch in the dispatcher rather than a ROUTES map entry. When adding any new API endpoint, add a handler module + ROUTES entry — never a new `route.ts` file — or the function count regresses and Vercel builds will fail again.
