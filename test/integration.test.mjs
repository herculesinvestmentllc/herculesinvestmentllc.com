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
