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

- [ ] Decide whether `Hercules LLC` / `Hercules Ecommerce` get their own artwork;
      they currently reuse the shared `pat-re` / `pat-man` symbols.
- [ ] The contact form's client-side validation is left to the server (the forms are
      `novalidate`); the 422 path now marks fields, so consider matching checks in JS
      to avoid the round trip.
- [ ] Consider a CSP-friendly check: the deployed CSP sets `script-src 'self'`, so keep
      new scripts in `assets/js/` and avoid inline `<script>`/`on*=` handlers.
