interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60_000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Sanitize an IP address string so it can only contain characters valid in
 * IPv4 / IPv6 addresses.  This prevents any injected characters from leaking
 * into rate-limit key strings or log output.
 */
export function sanitizeIp(raw: string | null | undefined): string {
  if (!raw) return 'unknown';
  // Allow digits, dots, colons, and lowercase hex (covers IPv4 + IPv6)
  const cleaned = raw.replace(/[^0-9a-fA-F.:]/g, '').slice(0, 45);
  return cleaned || 'unknown';
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}
