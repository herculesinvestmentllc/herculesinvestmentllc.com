// Integration tests: exercise the scripts the way CI does, against the real files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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

test('hidden start states are scoped to html.js so content survives a failed script', async () => {
  // The reveal animation hides .page, .rv, the hero underline and the timeline line.
  // If those rules applied unconditionally, a blocked or failed JavaScript load would
  // leave the page blank with no way to recover. They must all be gated on html.js,
  // which assets/js/boot.js adds synchronously in the head — and the gate must sit at
  // zero specificity (:where), or the "show" rule (.page.active, .rv.in, ...) would lose
  // to it and the content would stay hidden even with JS running. That bug shipped once.
  const css = (await Promise.all(
    ['base', 'chrome', 'home', 'pages', 'components', 'responsive']
      .map((n) => readFile(join(root, `assets/css/${n}.css`), 'utf8'))
  )).join('\n');

  assert.match(css, /:where\(html\.js\) \.page\{display:none\}/, '.page must hide only under html.js');
  assert.match(css, /:where\(html\.js\) \.rv\{/, '.rv must hide only under html.js');
  assert.match(css, /:where\(html\.js\) \.uline path\{/, '.uline must hide only under html.js');
  assert.match(css, /:where\(html\.js\) \.tl-line\{/, '.tl-line must hide only under html.js');

  // A bare `html.js .x` would outrank `.x.y`, so no gate may use it.
  const bare = css.match(/^html\.js \.[^{]+/gm);
  assert.deepEqual(bare, null, `gate must use :where(html.js), found: ${bare && bare.join(', ')}`);

  // And the gate itself must be set before the body renders.
  const html = await readFile(join(root, 'index.html'), 'utf8');
  assert.match(html, /<script src="assets\/js\/boot\.js(\?v=[0-9a-f]+)?"><\/script>/);
  const boot = await readFile(join(root, 'assets/js/boot.js'), 'utf8');
  assert.match(boot, /classList\.add\('js'\)/);

  // The hidden state must have a guaranteed way out. The reveal script sits at the end
  // of the body, so a request that hangs after boot.js runs would leave the page hidden
  // forever. boot.js arms a timer that adds .no-anim, the CSS lifts the hidden state
  // under it, and effects.js cancels the timer once it starts observing.
  assert.match(boot, /setTimeout/, 'boot.js must arm a reveal failsafe');
  assert.match(boot, /classList\.add\('no-anim'\)/, 'the failsafe must add .no-anim');
  assert.match(css, /:where\(html\.js\.no-anim\) \.rv\{opacity:1/, '.no-anim must lift the hidden state');
  const effects = await readFile(join(root, 'assets/js/effects.js'), 'utf8');
  assert.match(effects, /clearTimeout\(window\.__revealTimer\)/, 'effects.js must cancel the failsafe');
});

test('every local asset reference carries a content hash', async () => {
  // The CSS and JS filenames have no version, so a long cache would serve a stale
  // stylesheet after a deploy (a moved logo, a hidden section) while the HTML is fresh.
  // The build appends ?v=<hash of the file> so a changed file is a changed URL.
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/\b(?:href|src)="(assets\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 8, `expected the asset references, got ${refs.length}`);
  const unversioned = refs.filter((r) => !/\?v=[0-9a-f]{10}$/.test(r));
  assert.deepEqual(unversioned, [], `assets without a hash: ${unversioned.join(', ')}`);

  // The hash must track the bytes: two different file bodies must yield two different
  // URLs, otherwise a CSS edit would keep the old URL and stay cached.
  const { versionAssets } = await import('../scripts/build.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'hv-'));
  await mkdir(join(dir, 'assets/css'), { recursive: true });
  const link = '<link href="assets/css/x.css">';
  await writeFile(join(dir, 'assets/css/x.css'), 'a{}');
  const first = await versionAssets(link, dir);
  await writeFile(join(dir, 'assets/css/x.css'), 'b{}');
  const second = await versionAssets(link, dir);
  await rm(dir, { recursive: true, force: true });
  assert.match(first, /\?v=[0-9a-f]{10}"/, 'a real file must get a hash');
  assert.notEqual(first, second, 'different bytes must produce a different URL');
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
