// Builds the deployable root index.html from src/index.html + src/partials/*.html.
//
// The site is a single static page, so the browser only ever loads one HTML file.
// This keeps that file generated instead of hand-maintained: the shell lives in
// src/index.html with `<!-- @include: name.html -->` markers, the page sections
// live in src/partials/, and the output is the same index.html cPanel deploys.
//
//   node scripts/build.mjs          # write index.html
//   node scripts/build.mjs --check  # fail if index.html is out of date
//
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const partialsDir = join(srcDir, 'partials');
const shellPath = join(srcDir, 'index.html');
const outPath = join(root, 'index.html');

const INCLUDE = /^[ \t]*<!--\s*@include:\s*([\w.-]+)\s*-->[ \t]*$/gm;

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
  return render(shell, await loadPartials());
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
