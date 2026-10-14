// Unit tests for the build tooling. The build turns src/index.html plus the partials
// into the root index.html, so the include replacement and its error paths matter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../scripts/build.mjs';

test('render replaces an include marker with the partial', () => {
  const shell = '<main>\n<!-- @include: nav.html -->\n</main>';
  const out = render(shell, { 'nav.html': '<nav>hi</nav>' });
  assert.equal(out, '<main>\n<nav>hi</nav>\n</main>');
});

test('render replaces every occurrence of the same include', () => {
  // Each marker must be alone on its own line; both get replaced.
  const shell = '<!-- @include: a.html -->\n<!-- @include: a.html -->';
  assert.equal(render(shell, { 'a.html': 'X' }), 'X\nX');
});

test('render trims trailing whitespace of a partial', () => {
  assert.equal(render('<!-- @include: a.html -->', { 'a.html': 'X\n\n' }), 'X');
});

test('render accepts the whitespace variations of the marker', () => {
  // A marker line is replaced wholesale, so its leading indentation is consumed too.
  const shell = '<!--@include:a.html-->\n  <!--   @include:  a.html   -->';
  assert.equal(render(shell, { 'a.html': 'X' }), 'X\nX');
});

test('render throws on a missing partial', () => {
  assert.throws(
    () => render('<!-- @include: nope.html -->', {}),
    /Missing partial: nope\.html/
  );
});

test('render throws on an unresolved include left in the output', () => {
  // A partial whose body itself contains an include marker: the single pass cannot
  // resolve it, and the leftover check must catch it rather than ship a broken page.
  const partials = { 'outer.html': '<!-- @include: inner.html -->' };
  assert.throws(
    () => render('<!-- @include: outer.html -->', partials),
    /Unresolved include/
  );
});

test('render leaves a marker that is not on its own line alone', () => {
  // The pattern is anchored to a whole line, so an inline mention is content, not a marker.
  const shell = '<p>see <!-- @include: a.html --> here</p>';
  assert.equal(render(shell, { 'a.html': 'X' }), shell);
});
