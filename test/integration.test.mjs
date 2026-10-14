// Integration tests: exercise the scripts the way CI does, against the real files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadPartials, build } from '../scripts/build.mjs';
import { findProblems } from '../scripts/check-csp.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (args) => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });

test('build --check passes on the committed index.html', () => {
  const r = run(['scripts/build.mjs', '--check']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /up to date/);
});

test('the committed index.html is exactly what the build produces', async () => {
  const [committed, built] = await Promise.all([
    readFile(join(root, 'index.html'), 'utf8'),
    build(),
  ]);
  assert.equal(committed, built);
});

test('the committed index.html is CSP-safe', async () => {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  assert.deepEqual(findProblems(html), []);
});

test('check-csp.mjs exits 0 on the committed index.html', () => {
  const r = run(['scripts/check-csp.mjs']);
  assert.equal(r.status, 0, r.stderr);
});

test('loadPartials reads every src/partials/*.html', async () => {
  const partials = await loadPartials();
  const names = Object.keys(partials);
  assert.ok(names.length > 0, 'expected at least one partial');
  assert.ok(names.every((n) => n.endsWith('.html')), 'only .html files are loaded');
  assert.ok('nav.html' in partials, 'nav.html should be present');
});

test('index.html has a no-JS fallback that reveals the sections', async () => {
  // Sections are .page{display:none} until JS adds .active; without this the page
  // is blank when scripting is off. Guard against it being dropped from the shell.
  const html = await readFile(join(root, 'index.html'), 'utf8');
  assert.match(html, /<noscript>\s*<style>\.page\{display:block !important\}<\/style>\s*<\/noscript>/);
});

test('index.html carries the canonical URL and social meta', async () => {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  assert.match(html, /<link rel="canonical" href="https:\/\/herculesinvestmentsllc\.com\/">/);
  assert.match(html, /property="og:image" content="https:\/\/herculesinvestmentsllc\.com\/assets\/img\/og-cover\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
});

test('the JSON-LD Organization block is valid JSON', async () => {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'expected a JSON-LD block');
  const data = JSON.parse(m[1]);
  assert.equal(data['@type'], 'Organization');
  assert.equal(data.url, 'https://herculesinvestmentsllc.com/');
});

test('the social preview image exists and is 1200x630', async () => {
  const buf = await readFile(join(root, 'assets/img/og-cover.png'));
  assert.equal(buf.subarray(1, 4).toString(), 'PNG', 'expected a PNG');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  assert.deepEqual([width, height], [1200, 630]);
});

test('every button in index.html declares a type', async () => {
  // An implicit type="submit" inside a form would submit it by accident.
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const buttons = html.match(/<button\b[^>]*>/gi) || [];
  assert.ok(buttons.length > 0, 'expected buttons');
  const missing = buttons.filter((b) => !/\btype\s*=/.test(b));
  assert.deepEqual(missing, [], `buttons without a type: ${missing.join(', ')}`);
});

test('each contact form has a live region for its status message', async () => {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const forms = (html.match(/<form class="js-contact"/g) || []).length;
  const alerts = (html.match(/role="alert"/g) || []).length;
  const statuses = (html.match(/role="status" aria-live="polite"/g) || []).length;
  assert.equal(forms, 2, 'expected two contact forms');
  assert.equal(alerts, forms, 'each form needs a role="alert" error element');
  assert.equal(statuses, forms, 'each form needs a role="status" live region');
});

test('the htaccess block is well-formed and self-marked', async () => {
  const block = await readFile(join(root, 'deploy/root-htaccess-block.conf'), 'utf8');
  const open = (block.match(/<IfModule\b/g) || []).length;
  const close = (block.match(/<\/IfModule>/g) || []).length;
  assert.equal(open, close, 'every <IfModule> must be closed');
  assert.equal((block.match(/^# BEGIN hercules-security$/gm) || []).length, 1);
  assert.equal((block.match(/^# END hercules-security$/gm) || []).length, 1);
});

test('the htaccess block enables compression and caching', async () => {
  const block = await readFile(join(root, 'deploy/root-htaccess-block.conf'), 'utf8');
  assert.match(block, /<IfModule mod_deflate\.c>[\s\S]*AddOutputFilterByType DEFLATE/);
  assert.match(block, /<IfModule mod_expires\.c>[\s\S]*ExpiresActive On/);
  assert.match(block, /ExpiresByType text\/css "access plus 1 day"/);
});
