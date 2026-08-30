/**
 * security-logger.ts
 *
 * Fire-and-forget helper that writes a record to the `security_events`
 * Appwrite collection for every transaction and admin action.
 *
 * All writes are best-effort — a logging failure NEVER breaks the caller.
 * Use `logSecurityEvent(...)` from any server-side API route.
 */
import 'server-only';
import { ID } from 'node-appwrite';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';

export const SECURITY_EVENTS_COLLECTION = 'security_events';

export type Severity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface SecurityEventPayload {
  /** The category of event, e.g. "GIFT_SENT", "ADMIN_BAN", "RATE_LIMITED" */
  event_type: string;
  /** 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL' */
  severity?: Severity;
  /** User who triggered the action (sender / actor) */
  user_id?: string;
  /** Admin performing the action (for admin events) */
  actor_id?: string;
  /** Role of the acting admin */
  actor_role?: string;
  /** User or resource the action targets */
  target_id?: string;
  /** Numeric amount involved (stored as string to avoid float issues) */
  amount?: number;
  /** Currency type, e.g. "DIAMOND", "GOLD", "STAR" */
  currency?: string;
  /** "success" | "failure" | "blocked" */
  result?: string;
  /** API endpoint that generated the event */
  endpoint?: string;
  /** HTTP method */
  method?: string;
  /** Caller IP address */
  ip_address?: string;
  /** User-agent string */
  user_agent?: string;
  /** Human-readable detail / error message */
  details?: string;
}

/**
 * Write a security event to Appwrite. Always resolves — never throws.
 * Safe to call with `void logSecurityEvent(...)` (no await required).
 */
export async function logSecurityEvent(payload: SecurityEventPayload): Promise<void> {
  try {
    const db = getAdminDatabases();
    await db.createDocument(
      DATABASE_ID,
      SECURITY_EVENTS_COLLECTION,
      ID.unique(),
      {
        event_type:  payload.event_type,
        severity:    payload.severity   ?? 'INFO',
        user_id:     payload.user_id    ?? null,
        actor_id:    payload.actor_id   ?? null,
        actor_role:  payload.actor_role ?? null,
        target_id:   payload.target_id  ?? null,
        amount:      payload.amount != null ? String(payload.amount) : null,
        currency:    payload.currency   ?? null,
        result:      payload.result     ?? 'success',
        endpoint:    payload.endpoint   ?? null,
        method:      payload.method     ?? null,
        ip_address:  payload.ip_address ?? null,
        user_agent:  payload.user_agent ?? null,
        details:     payload.details    ?? null,
      }
    );
  } catch {
    // Logging must never break the calling route — swallow silently.
  }
}

/** Convenience wrapper for extracting common request metadata. */
export function extractRequestMeta(req: Request) {
  return {
    ip_address: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown',
    user_agent: req.headers.get('user-agent')?.slice(0, 512) ?? undefined,
    endpoint:   new URL(req.url).pathname,
    method:     req.method,
  };
}
