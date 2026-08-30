/**
 * Auto-bumps SW_VERSION in public/sw.js with a build timestamp.
 * Runs automatically before every `npm run build` via the prebuild hook.
 * This ensures each production deploy gets a fresh cache namespace,
 * so stale JS/CSS/pages are evicted automatically.
 */
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../public/sw.js');
let content = fs.readFileSync(swPath, 'utf8');

const newVersion = `v${Date.now()}`;
content = content.replace(/const SW_VERSION = '[^']+';/, `const SW_VERSION = '${newVersion}';`);

fs.writeFileSync(swPath, content);
console.log(`[ViMore] SW_VERSION bumped → ${newVersion}`);
