---
name: Verification flow
description: How creator verification works — PENDING until admin approves, no instant is_verified
---

**Flow:**
1. User calls `/api/transaction/verify` (POST): fee is deducted server-side, a `verification_records` doc is created with `status: PENDING`. `is_verified` is NOT set. Returns `{ok: true, status: 'PENDING', newBalance}`.
2. Admin sees pending requests in Command Core → Verifications tab (calls `/api/admin/verifications` GET).
3. Admin approves via `/api/admin/verify-approve` (POST, `{recordId}`): sets `is_verified: true` on user doc, updates record to APPROVED, sends notification.
4. Admin rejects via `/api/admin/verify-reject` (POST, `{recordId, reason}`): updates record to REJECTED, refunds the fee, sends notification.

**Why:** Instant auto-approval was a security risk. Admin review ensures quality control.

**How to apply:** `verifyUser` in PostContext does NOT optimistically set `isVerified: true`. Shows "Verification Submitted ⏳" toast. Client balance is updated only after server confirms deduction.
