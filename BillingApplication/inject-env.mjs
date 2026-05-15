/**
 * Writes environment.prod.ts from .env / Vercel env vars. Lives next to package.json so it is always deployed.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const templatePath = resolve(root, 'src/environments/environment.prod.template.ts');
const outPath = resolve(root, 'src/environments/environment.prod.ts');
const envPath = resolve(root, '.env');

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(envPath);

const apiBaseUrl = (process.env.NG_APP_API_BASE_URL || process.env.API_BASE_URL || '')
  .trim()
  .replace(/\/$/, '');

if (!apiBaseUrl) {
  console.error('[inject-env] Set NG_APP_API_BASE_URL in .env or Vercel Environment Variables.');
  process.exit(1);
}

const appDisplayName = (
  process.env.NG_APP_DISPLAY_NAME ||
  process.env.APP_DISPLAY_NAME ||
  'RR Silks Inventory Info'
).trim();

let content = readFileSync(templatePath, 'utf8');
content = content.replaceAll('@@NG_APP_API_BASE_URL@@', apiBaseUrl);
content = content.replaceAll('@@NG_APP_DISPLAY_NAME@@', appDisplayName);

writeFileSync(outPath, content, 'utf8');
console.log('[inject-env] Wrote environment.prod.ts');
