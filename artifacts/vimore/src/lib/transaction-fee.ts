/**
 * Credit transaction fee policy.
 *
 * In-app Credits are non-withdrawable and are stored as whole credits.
 * Every positive transaction pays at least 1 Credit, while larger
 * transactions pay the exact whole-credit 10% amount.
 */
export function calculatePlatformFee(amount: number): number {
  const wholeAmount = Math.floor(Number(amount));
  if (!Number.isFinite(wholeAmount) || wholeAmount <= 0) return 0;
  return Math.max(1, Math.floor(wholeAmount * 0.1));
}

export const PLATFORM_FEE_PERCENT = 10;