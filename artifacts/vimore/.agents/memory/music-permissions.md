---
name: Music collection permissions
description: Why music tracks don't show up client-side despite existing in the database
---

**The problem:** Track documents in the Appwrite `tracks` collection have user-specific permissions only: `read("user:{ownerId}")`. This means the Appwrite web SDK (using the logged-in user's session) can only read tracks owned by that specific user. Other users — even logged-in ones — get 0 results.

**The fix:** `/api/music/catalog` (server-side) uses the admin API key via `getAdminDatabases()` which bypasses all document-level permissions. The MusicContext now calls this route instead of using `databases.listDocuments` directly from the browser.

**Why:** Track documents were created without `read("any")` or `read("users")` permissions — just `read("user:{id}")`. The admin SDK (with API key) ignores document-level permissions and sees all documents.

**How to apply:** Any new collection where documents need to be readable by all users must have `read("any")` or `read("users")` permission set on the documents (or the collection default). If that's not possible, use an admin-backed API route to fetch them.
