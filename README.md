# herculesinvestmentllc.com

Static marketing site for Hercules Investments LLC, served from a cPanel host.
No framework, no bundler and no runtime dependencies: plain HTML, CSS and
browser JavaScript, plus one PHP endpoint for the contact form.

The live domain is <https://herculesinvestmentsllc.com/> (note the extra "s";
the GitHub repository name drops it).

## Layout

```
index.html                 generated — do not edit by hand
src/index.html             page shell (head, meta, section order)
src/partials/*.html        the sections the shell includes
assets/css/*.css           stylesheets, loaded in order from the shell
assets/js/*.js             browser scripts, loaded at the end of <body>
assets/img/                brand mark and the social preview card
api/contact.php            contact form endpoint (PHP)
api/.htaccess              denies direct access to config files
deploy/root-htaccess-block.conf   the block merged into public_html/.htaccess
scripts/build.mjs          builds index.html from src/
scripts/check-csp.mjs      fails if index.html would break the CSP
test/                      node:test suites
schema.sql                 database schema for the contact form
.cpanel.yml                cPanel deploy tasks
404.html, robots.txt, sitemap.xml   standalone pages and crawl files
```

## Build

`index.html` is generated from `src/`. Edit `src/index.html` or a partial, then
rebuild:

```sh
npm run build          # writes index.html
npm run check          # fails if index.html is stale or not CSP-safe
```

The build replaces markers of the form `<!-- @include: name.html -->` (each on
its own line) with the matching file from `src/partials/`. CI runs
`node scripts/build.mjs --check`, so a pull request with a stale `index.html`
cannot be merged.

## Test

```sh
npm test               # node --test, no dependencies to install
```

The suites cover the build, the CSP guard and the built page (metadata, form
markup, the htaccess block).

## CSP rule

The site ships a strict `script-src 'self'`. Do not add an inline `<script>` or
an inline `on*=` handler to the HTML; put scripts in `assets/js/` and attach
listeners there. `scripts/check-csp.mjs` runs in CI and fails the build if
either appears. Non-JavaScript `<script>` types (such as the JSON-LD block) are
allowed, because `script-src` does not apply to them. Inline `<style>` is
allowed, since the CSP keeps `style-src 'unsafe-inline'`.

## Contact form

`assets/js/contact.js` posts JSON to `/api/contact.php`. The endpoint validates
the input again, writes the message to the database and then sends a
notification email. It also keeps a per-IP throttle and an hourly cap, and
ignores a hidden honeypot field.

Configuration lives in `api/config.php`, which is git-ignored. Start from
`api/config.example.php`. Put the real file **outside** `public_html` (for
example `/home/USER/private/config.php`); the endpoint falls back to
`api/config.php` inside the web root, which `api/.htaccess` protects. Create the
database with `schema.sql`.

## Deploy

Deployment is driven by `.cpanel.yml`, which cPanel runs on each push to the
tracked branch:

- `index.html`, `robots.txt`, `sitemap.xml`, `404.html` and the `assets/`
  subfolders (`css`, `js`, `img`) are copied to `public_html`.
- `api/contact.php` and `api/.htaccess` are copied to `public_html/api`.
- The marked block in `deploy/root-htaccess-block.conf` replaces the
  `# BEGIN hercules-security` … `# END hercules-security` block in
  `public_html/.htaccess`, leaving cPanel's own lines (PHP handler, cache rules)
  untouched. The swap is idempotent.

Only the listed files are published, so `schema.sql`, `src/`, `deploy/`, tests
and tooling stay out of the web root.

### After a deploy

The htaccess block relies on `AllowOverride` for `Options`, `ErrorDocument` and
the `mod_*` modules. If the site returns 500 after a deploy, check the host's
error log first; `Options -Indexes` is the most likely culprit on a host that
does not allow `Options`. Compression, cache headers and HSTS all take effect on
the next request after the block is applied.

## Notes

- No npm or Composer dependencies. The test runner is Node's built-in
  `node:test`; `package.json` exists only for the scripts.
- `TODO.md` records the findings from the debug pass and their status.
