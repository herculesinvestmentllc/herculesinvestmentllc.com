// Unit tests for the CSP guard. findProblems() is the whole check: it scans the built
// index.html for the two things the deployed script-src 'self' would refuse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findProblems } from '../scripts/check-csp.mjs';

test('clean HTML has no problems', () => {
  const html = '<!doctype html><html><body><script src="/assets/js/core.js"></script></body></html>';
  assert.deepEqual(findProblems(html), []);
});

test('an inline <script> without src is reported', () => {
  const problems = findProblems('<body><script>var a=1;</script></body>');
  assert.equal(problems.length, 1);
  assert.match(problems[0], /inline <script> without src: 1/);
});

test('a <script src> is not reported', () => {
  assert.deepEqual(findProblems('<script src="/a.js" defer></script>'), []);
});

test('an inline event handler is reported', () => {
  const problems = findProblems('<body onload="x()">');
  assert.equal(problems.length, 1);
  assert.match(problems[0], /inline event handler\(s\): onload="/);
});

test('onclick and onmouseover are both reported and de-duplicated', () => {
  const html = '<a onclick="f()" onclick="g()">t</a><div onmouseover = "h()">d</div>';
  const problems = findProblems(html);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /onclick="/);
  assert.match(problems[0], /onmouseover = "/);
});

test('a handler with spaces around the equals sign is still caught', () => {
  assert.equal(findProblems('<div  onmouseover = "g()" >').length, 1);
});

test('the word "on" in text and hyphenated attributes is not a handler', () => {
  assert.deepEqual(findProblems('<p>turn the light on and off</p>'), []);
  assert.deepEqual(findProblems('<div data-on-open="x"></div>'), []);
});

test('both problem kinds are reported together', () => {
  const problems = findProblems('<body onload="x()"><script>a()</script></body>');
  assert.equal(problems.length, 2);
});

test('a JSON-LD data block is not treated as an inline script', () => {
  // CSP script-src does not apply to non-JavaScript script types.
  const html = '<script type="application/ld+json">{"@type":"Organization"}</script>';
  assert.deepEqual(findProblems(html), []);
});

test('a module script without src is still a problem', () => {
  assert.equal(findProblems('<script type="module">import x</script>').length, 1);
});

test('a javascript-typed inline script is still a problem', () => {
  assert.equal(findProblems('<script type="text/javascript">a()</script>').length, 1);
  assert.equal(findProblems('<script type="application/javascript">a()</script>').length, 1);
});
