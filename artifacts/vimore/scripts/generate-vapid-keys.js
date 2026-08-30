#!/usr/bin/env node

/**
 * Generates a VAPID key pair for web push notifications and writes them
 * to .env.local so they are immediately available for local development.
 *
 * Run once:  npm run generate-vapid
 *
 * Then copy the printed values into Vercel → Settings → Environment Variables.
 */

const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const ENV_LOCAL = path.resolve(process.cwd(), '.env.local');
const KEYS = ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'];

function readEnvLocal() {
  if (!fs.existsSync(ENV_LOCAL)) return {};
  const lines = fs.readFileSync(ENV_LOCAL, 'utf8').split('\n');
  const map = {};
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) map[key.trim()] = rest.join('=').trim();
  }
  return map;
}

function writeEnvLocal(map) {
  const content = Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n';
  fs.writeFileSync(ENV_LOCAL, content, 'utf8');
}

/** Redact a key for display — show first 6 and last 4 chars only. */
function redact(val) {
  if (!val || val.length < 12) return '***';
  return val.slice(0, 6) + '…' + val.slice(-4);
}

const existing = readEnvLocal();

const alreadySet = KEYS.every(k => existing[k] && existing[k].length > 0);
if (alreadySet) {
  console.log('\n✅  VAPID keys already exist in .env.local — no changes made.\n');
  console.log('   NEXT_PUBLIC_VAPID_PUBLIC_KEY =', existing['NEXT_PUBLIC_VAPID_PUBLIC_KEY']);
  // Never print the private key in full — show only a redacted preview
  console.log('   VAPID_PRIVATE_KEY            =', redact(existing['VAPID_PRIVATE_KEY']), '(redacted — see .env.local)');
  console.log('   VAPID_SUBJECT                =', existing['VAPID_SUBJECT']);
  console.log('\n   To regenerate, delete those three lines from .env.local and run again.\n');
  process.exit(0);
}

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
const subject = existing['VAPID_SUBJECT'] || 'mailto:admin@vimore.app';

existing['NEXT_PUBLIC_VAPID_PUBLIC_KEY'] = publicKey;
existing['VAPID_PRIVATE_KEY'] = privateKey;
existing['VAPID_SUBJECT'] = subject;

writeEnvLocal(existing);

console.log('\n🔑  VAPID keys generated and saved to .env.local\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Copy these into Vercel → Project → Settings → Environment Variables');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('  NEXT_PUBLIC_VAPID_PUBLIC_KEY =', publicKey);
// Write the private key only to .env.local — never echo it to the terminal
console.log('  VAPID_PRIVATE_KEY            = (saved to .env.local — do not print)');
console.log('  VAPID_SUBJECT                =', subject);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n  ⚠️  Keep VAPID_PRIVATE_KEY secret — never commit it to Git.\n');
console.log('  Open .env.local to copy the VAPID_PRIVATE_KEY value.\n');
