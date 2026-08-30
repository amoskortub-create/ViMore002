#!/usr/bin/env node
/**
 * Routing smoke test for the consolidated API dispatchers.
 *
 * This does NOT test business logic (auth, DB writes, etc). It only verifies
 * that every known endpoint is still reachable through the 3 catch-all
 * dispatchers (i.e. the ROUTES map entry exists and resolves to a handler),
 * and that unknown paths correctly fall through to 404.
 *
 * A route "passes" if it returns any status OTHER than 404 (missing route)
 * or 405 (method not implemented by the dispatcher's exported HTTP verbs).
 * Requests are sent with no auth/body, so 400/401/403/500 are all expected
 * and healthy — they prove the handler was invoked, just rejected the
 * unauthenticated/empty input as it should.
 *
 * Run with the dev server already running: node scripts/test-api-routes.mjs
 */

const BASE_URL = process.env.API_TEST_BASE_URL || 'http://localhost:5000';

// Mirrors the ROUTES maps in src/app/api/[...path]/route.ts,
// src/app/api/admin/[...path]/route.ts and src/app/api/oauth/[...path]/route.ts.
// Keep this list in sync when adding/removing endpoints.
const ROUTES = [
  // admin dispatcher
  { path: '/api/admin/active-users', method: 'GET' },
  { path: '/api/admin/ban', method: 'POST' },
  { path: '/api/admin/check', method: 'GET' },
  { path: '/api/admin/login', method: 'POST' },
  { path: '/api/admin/products/delete', method: 'POST' },
  { path: '/api/admin/suspend', method: 'POST' },
  { path: '/api/admin/users/warn', method: 'POST' },
  { path: '/api/admin/verifications', method: 'GET' },
  { path: '/api/admin/verify-approve', method: 'POST' },
  { path: '/api/admin/verify-reject', method: 'POST' },

  // oauth dispatcher
  { path: '/api/oauth/clients/info', method: 'GET' },
  { path: '/api/oauth/clients', method: 'GET' },
  { path: '/api/oauth/clients', method: 'POST' },
  { path: '/api/oauth/clients', method: 'DELETE' },
  { path: '/api/oauth/connected', method: 'GET' },
  { path: '/api/oauth/connected', method: 'DELETE' },
  { path: '/api/oauth/grant', method: 'POST' },
  { path: '/api/oauth/revoke', method: 'POST' },
  { path: '/api/oauth/token', method: 'POST' },
  { path: '/api/oauth/userinfo', method: 'GET' },

  // root dispatcher
  { path: '/api/advertise/submit', method: 'POST' },
  { path: '/api/cron/cleanup', method: 'GET' },
  { path: '/api/cron/expiry-alerts', method: 'GET' },
  // Note: the file proxy legitimately 404s for a non-existent fileId even
  // when routing works correctly (it forwards to Appwrite storage, which
  // 404s on unknown files). We only assert it does NOT hit the dispatcher's
  // generic 404 for an unsupported bucket (covered in NEGATIVE_ROUTES below),
  // so this route is intentionally excluded from the strict "not 404" check.
  { path: '/api/intelligent', method: 'POST' },
  { path: '/api/intelligent/delete', method: 'DELETE' },
  { path: '/api/knowledge-admin', method: 'GET' },
  { path: '/api/knowledge-admin', method: 'DELETE' },
  { path: '/api/link-preview', method: 'GET' },
  { path: '/api/marketplace/create-store', method: 'POST' },
  { path: '/api/marketplace/messages/conversations', method: 'GET' },
  { path: '/api/marketplace/messages/list', method: 'GET' },
  { path: '/api/marketplace/messages/list', method: 'PATCH' },
  { path: '/api/marketplace/messages/send', method: 'POST' },
  { path: '/api/messages/mark-read', method: 'POST' },
  { path: '/api/messages/send', method: 'POST' },
  { path: '/api/moderate', method: 'POST' },
  { path: '/api/music/catalog', method: 'GET' },
  { path: '/api/music/stream', method: 'POST' },
  { path: '/api/notifications/delete', method: 'DELETE' },
  { path: '/api/payment/approve', method: 'POST' },
  { path: '/api/payment/reject', method: 'POST' },
  { path: '/api/presence', method: 'POST' },
  { path: '/api/push/send', method: 'POST' },
  { path: '/api/push/subscribe', method: 'POST' },
  { path: '/api/push/unsubscribe', method: 'POST' },
  { path: '/api/transaction/gift', method: 'POST' },
  { path: '/api/transaction/lock-post', method: 'POST' },
  { path: '/api/transaction/lock-post', method: 'DELETE' },
  { path: '/api/transaction/subscribe', method: 'POST' },
  { path: '/api/transaction/unlock-post', method: 'POST' },
  { path: '/api/transaction/verify', method: 'POST' },
  { path: '/api/upload/reel', method: 'POST' },
  { path: '/api/user/activity', method: 'POST' },
  { path: '/api/user/profile', method: 'POST' },
  { path: '/api/withdraw', method: 'POST' },
];

// Paths that must NOT resolve (i.e. must 404) — guards against the dispatcher
// becoming overly permissive.
const NEGATIVE_ROUTES = [
  { path: '/api/does-not-exist', method: 'GET' },
  { path: '/api/admin/does-not-exist', method: 'GET' },
  { path: '/api/oauth/does-not-exist', method: 'GET' },
  { path: '/api/file/not-an-allowed-bucket/xyz', method: 'GET' },
];

// The file proxy route is special-cased: it validates fileId format itself
// (400 for malformed IDs) before ever reaching Appwrite, so we can prove
// routing works by sending a deliberately malformed fileId and expecting
// 400 (from the handler) rather than 404 (from the dispatcher's ROUTES miss).
const FILE_ROUTE_CHECK = { path: '/api/file/profile_images/!!!invalid!!!', method: 'GET', expect: 400 };

async function hit(path, method) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { method });
    return { status: res.status, ok: true };
  } catch (err) {
    return { status: null, ok: false, error: err.message };
  }
}

async function main() {
  let failures = 0;
  const results = [];

  for (const { path, method } of ROUTES) {
    const { status, ok, error } = await hit(path, method);
    const routed = ok && status !== 404 && status !== 405;
    if (!routed) failures++;
    results.push({ kind: 'route', path, method, status, routed, error });
  }

  for (const { path, method } of NEGATIVE_ROUTES) {
    const { status, ok, error } = await hit(path, method);
    const correctly404 = ok && status === 404;
    if (!correctly404) failures++;
    results.push({ kind: 'negative', path, method, status, routed: correctly404, error });
  }

  {
    const { path, method, expect } = FILE_ROUTE_CHECK;
    const { status, ok, error } = await hit(path, method);
    const routed = ok && status === expect;
    if (!routed) failures++;
    results.push({ kind: 'route', path, method, status, routed, error });
  }

  const width = Math.max(...results.map((r) => `${r.method} ${r.path}`.length)) + 2;
  for (const r of results) {
    const label = `${r.method} ${r.path}`.padEnd(width);
    const tag = r.kind === 'negative' ? '[404-expected]' : '[routed]      ';
    const mark = r.routed ? 'PASS' : 'FAIL';
    console.log(`${mark}  ${tag}  ${label} -> ${r.status ?? r.error}`);
  }

  console.log(`\n${results.length - failures}/${results.length} checks passed.`);
  if (failures > 0) {
    console.error(`${failures} routing check(s) failed.`);
    process.exit(1);
  }
}

main();
