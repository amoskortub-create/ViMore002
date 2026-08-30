---
name: Imported Next.js apps in this workspace
description: Routing and dependency constraints when an imported Next.js app shares the workspace with the generic API artifact.
---

Imported Next.js apps use their own `/api/*` routes, but the generic API artifact is mounted at `/api` and wins proxy routing by specificity. Forward unhandled API requests from the generic service to the app's assigned web port, while retaining the shared health endpoint.

**Why:** The shared API mount otherwise turns valid app routes such as authentication and catalog requests into 404 responses.

**How to apply:** When importing another Next.js app, preserve its server-side secret names, make its port read `PORT`, and account for the `/api` route collision before preview verification.