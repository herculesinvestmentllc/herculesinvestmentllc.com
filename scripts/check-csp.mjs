// Guards the deployed Content-Security-Policy (see deploy/root-htaccess-block.conf).
//
// The CSP sets script-src 'self', so the browser will refuse an inline <script> or an
// inline on*= handler. Both are easy to add by accident while editing src/partials/, and
// the failure is silent in development, so catch them here instead.
//
//   node scripts/check-csp.mjs
//
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(join(root, 'index.html'), 'utf8');

const problems = [];

// Inline event handlers: an on*="..." attribute on a real tag. The leading \s keeps this
// from matching the word "on" inside text or a hyphenated attribute like data-on-foo.
const handlers = html.match(/\son[a-z]+\s*=\s*["']/gi);
if (handlers) problems.push(`inline event handler(s): ${[...new Set(handlers.map(h => h.trim()))].join(', ')}`);

// Inline <script> bodies: a <script> tag with no src attribute.
const inlineScripts = html.match(/<script\b(?![^>]*\bsrc=)[^>]*>/gi);
if (inlineScripts) problems.push(`inline <script> without src: ${inlineScripts.length}`);

if (problems.length) {
  console.error("index.html is not CSP-safe (script-src 'self'):");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("index.html is CSP-safe (no inline handlers or inline <script>).");
