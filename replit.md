# ViMore

ViMore is a social networking and creator platform with feeds, music, reels, messaging, marketplace tools, and creator features.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/vimore run dev` — run the imported ViMore Next.js app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/vimore/` — imported Next.js application and its Appwrite/Gemini integrations
- `artifacts/api-server/` — shared API entrypoint; forwards unhandled `/api/*` requests to ViMore
- `artifacts/vimore/appwrite.json` — Appwrite collection and bucket configuration

## Architecture decisions

- ViMore keeps Appwrite server access and Gemini access server-side through Replit Secrets.
- The shared API service preserves `/api/healthz` and forwards ViMore API requests to avoid the workspace `/api` route collision.

## Product

ViMore provides social feeds, messaging, music, reels, creator dashboards, marketplace listings, event ticketing, notifications, and an admin dashboard.

## User preferences

The Appwrite and Gemini credentials must remain protected project secrets.

## Gotchas

- The app expects `APPWRITE_API_KEY` and `GEMINI_API_KEY` as protected secrets; Gemini also supports the source repository's `GOOGLE_GENERATIVE_AI_API_KEY` name.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
