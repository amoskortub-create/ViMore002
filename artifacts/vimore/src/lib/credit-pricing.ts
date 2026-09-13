/**
 * Prices for credit-based creator promotion features.
 *
 * Keep these values shared between the UI and server handlers so the amount
 * shown to users is always the amount charged.
 */
export const CREDIT_PRICES = {
  verification: 20,
  postBoostPerDay: 4,
  adPerDay: 5,
} as const;