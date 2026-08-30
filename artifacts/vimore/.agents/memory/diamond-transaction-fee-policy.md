---
name: Diamond transaction fee policy
description: The user-approved fee rule for creator gifts, post unlocks, and subscriptions
---

All positive Diamond gifts, post unlocks, and creator subscriptions use the same 10% platform fee for verified and unverified creators. Because balances are whole Diamonds, calculate the fee as the whole-Diamond 10% amount rounded down, with a minimum of 1 Diamond.

**Why:** The user explicitly requested equal treatment for verified and unverified creators and asked small transactions to still produce a 1-Diamond application fee.

**How to apply:** Keep all three transaction handlers and their admin/user-facing fee copy on the shared policy. For a transaction amount `n`, creator credit is `n - max(1, floor(n * 0.10))`; zero/free transactions have no fee. The gift catalog and gift endpoint should start at 3 Diamonds.