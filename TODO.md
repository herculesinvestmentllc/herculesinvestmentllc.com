# TODO

Debug pass on 2026-10-14. The seven findings from that pass are fixed; each is a
commit on `refactor/modular-and-fixes`.

## Done

1. [x] Honeypot submit-timer no longer drops real messages.
       The endpoint trusted a client-supplied `elapsed` value and returned success
       without saving when it was under two seconds. Check removed; honeypot,
       per-IP throttle and hourly cap remain.
2. [x] Back button returns to the previous page.
       Router writes `pushState({page})` entries and a `popstate` listener drives
       Back/Forward instead of `replaceState`.
3. [x] Mobile menu accessibility.
       `aria-hidden` now follows the open state, `inert` while closed, focus moves
       to the first link on open and back to the burger on close.
4. [x] `.pf-fills` filter bar defined in `assets/css/pages.css`; inline style removed.
5. [x] 422 responses highlight the rejected fields (`is-invalid` + `aria-invalid`,
       focus on the first, mark clears on edit).
6. [x] Brands page lists all six brands, matching the home page.
7. [x] Unused `newsletter_subscribers` table removed from `schema.sql`.

## Structure

- [x] `index.html` is now generated: edit `src/index.html` and `src/partials/*.html`,
      then run `node scripts/build.mjs`. `node scripts/build.mjs --check` fails if the
      committed `index.html` is stale.

## Later

- [x] `Hercules LLC` / `Hercules Ecommerce` got their own artwork (`pat-llc`, `pat-ecom`).
- [x] Contact forms validate in the browser against the same rules the endpoint uses
      (name present, email shape, message at least five characters); the server still
      enforces them.
- [x] CSP is enforced by `scripts/check-csp.mjs`, run in CI: it fails the build if
      `index.html` gains an inline `<script>` or an inline `on*=` handler, both of which
      the deployed `script-src 'self'` would refuse. New scripts go in `assets/js/`.
- [x] CI added in `.github/workflows/build.yml` (runs on pull requests and pushes to
      `main`): `node scripts/build.mjs --check`, `node scripts/check-csp.mjs`, and
      `node --check` on every file in `assets/js/`.
