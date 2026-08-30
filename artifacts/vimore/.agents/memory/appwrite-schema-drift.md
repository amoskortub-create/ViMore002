---
name: Live Appwrite schema drift
description: How to handle unknown Appwrite attributes when the imported schema snapshot is incomplete
---

When an Appwrite request fails with an unknown attribute, inspect the live collection definition before changing endpoint logic. Imported `appwrite.json` snapshots may omit collections or attributes that the running app already expects.

**Why:** The deployed `transactions` collection was missing an attribute used by multiple transaction flows, while local code and analytics already depended on it. Removing the field from one endpoint would have hidden the schema problem and broken reporting consistency.

**How to apply:** Compare the live collection attributes and indexes with all write/read paths, add compatible optional schema fields when appropriate, and keep related handlers aligned with the deployed schema.