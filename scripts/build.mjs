// Builds the deployable root index.html from src/index.html + src/partials/*.html.
//
// The site is a single static page, so the browser only ever loads one HTML file.
// This keeps that file generated instead of hand-maintained: the shell lives in
// src/index.html with `<!-- @include: name.html -->` markers, the page sections
// live in src/partials/, and the output is the same index.html cPanel deploys.
//
// Asset URLs get a content hash (?v=<hash>) on the way out. The CSS and JS filenames
// carry no version, and they are cached for a long time, so without this a returning
// visitor keeps an old stylesheet or script after a deploy — the page then renders
// with stale rules (a moved logo, a hidden section) even though the HTML is fresh.
// Hashing the URL means a changed file is a changed URL, so it is always re-fetched.
//
//   node scripts/build.mjs          # write index.html
//   node scripts/build.mjs --check  # fail if index.html is out of date
//
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const partialsDir = join(srcDir, 'partials');
const shellPath = join(srcDir, 'index.html');
const outPath = join(root, 'index.html');

const INCLUDE = /^[ \t]*<!--\s*@include:\s*([\w.-]+)\s*-->[ \t]*$/gm;

// href="assets/..." or src="assets/..." with an optional existing query string.
// Only local assets are matched, so absolute URLs (og:image, canonical) are left alone.
const ASSET = /(\b(?:href|src)=")(assets\/[^"?]+)(?:\?[^"]*)?"/g;

export function render(shell, partials) {
  const used = new Set();
  const out = shell.replace(INCLUDE, (_match, name) => {
    if (!(name in partials)) throw new Error(`Missing partial: ${name}`);
    used.add(name);
    return partials[name].replace(/\s+$/, '');
  });
  const leftover = out.match(INCLUDE);
  if (leftover) throw new Error(`Unresolved include: ${leftover[0]}`);
  return out;
}

// Rewrites every local asset reference to carry a hash of that file's bytes. Missing
// files are left as-is so a typo surfaces as a 404 in testing rather than a crash.
export async function versionAssets(html, baseDir = root) {
  const seen = new Map();
  const refs = [...html.matchAll(ASSET)].map((m) => m[2]);
  for (const rel of new Set(refs)) {
    try {
      const buf = await readFile(join(baseDir, rel));
      seen.set(rel, createHash('sha256').update(buf).digest('hex').slice(0, 10));
    } catch {
      // Leave the reference untouched; the build --check / tests catch a bad path.
    }
  }
  return html.replace(ASSET, (match, attr, rel) => {
    const hash = seen.get(rel);
    return hash ? `${attr}${rel}?v=${hash}"` : match;
  });
}

export async function loadPartials(dir = partialsDir) {
  const names = await readdir(dir);
  const partials = {};
  for (const name of names) {
    if (!name.endsWith('.html')) continue;
    partials[name] = await readFile(join(dir, name), 'utf8');
  }
  return partials;
}

export async function build() {
  const shell = await readFile(shellPath, 'utf8');
  return versionAssets(render(shell, await loadPartials()));
}

// Only touch the filesystem when run as a script; importing this module for tests must
// have no side effects.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const built = await build();

  if (process.argv.includes('--check')) {
    const current = await readFile(outPath, 'utf8');
    if (current !== built) {
      console.error('index.html is out of date — run: node scripts/build.mjs');
      process.exit(1);
    }
    console.log('index.html is up to date.');
  } else {
    await writeFile(outPath, built);
    console.log(`Built index.html (${built.length} bytes).`);
  }
}
