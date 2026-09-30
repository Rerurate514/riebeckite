import assert from "node:assert/strict";
import { test } from "node:test";
import { assertGoldenJson } from "../../../../tests/helpers/golden.ts";
import { extractTableOfContents } from "../index.ts";

test("extracts h2-h4 headings that carry an id", () => {
  const html = [
    '<h2 id="intro">Intro</h2>',
    '<h3 id="setup">Setup</h3>',
    '<h4 id="details">Details</h4>',
  ].join("");

  assert.deepEqual(extractTableOfContents(html), [
    { id: "intro", level: 2, title: "Intro" },
    { id: "setup", level: 3, title: "Setup" },
    { id: "details", level: 4, title: "Details" },
  ]);
});

test("ignores headings outside h2-h4 and headings without an id", () => {
  const html = [
    '<h1 id="title">Title</h1>',
    '<h5 id="deep">Too deep</h5>',
    "<h2>No id</h2>",
    '<h3 id="kept">Kept</h3>',
  ].join("");

  assert.deepEqual(extractTableOfContents(html), [
    { id: "kept", level: 3, title: "Kept" },
  ]);
});

test("only matches double-quoted ids and requires a matching end tag", () => {
  const html = [
    "<h2 id='single'>Single quoted</h2>",
    '<h2 id="closed">Closed</h2>',
    '<h2 id="unclosed">Never ends',
  ].join("");

  assert.deepEqual(extractTableOfContents(html), [
    { id: "closed", level: 2, title: "Closed" },
  ]);
});

test("strips inline markup and decodes HTML entities in titles", () => {
  const html = [
    '<h2 id="a">A <code>code</code> &amp; <em>emphasis</em></h2>',
    '<h3 id="b">&lt;tag&gt; &quot;quoted&quot; &#39;apostrophe&#39;</h3>',
  ].join("");

  assert.deepEqual(extractTableOfContents(html), [
    { id: "a", level: 2, title: "A code & emphasis" },
    { id: "b", level: 3, title: "<tag> \"quoted\" 'apostrophe'" },
  ]);
});

test("drops headings whose stripped title is empty or whitespace only", () => {
  const html = [
    '<h2 id="empty"></h2>',
    '<h2 id="blank">   </h2>',
    '<h2 id="markup"><span></span></h2>',
    '<h2 id="real">Real</h2>',
  ].join("");

  assert.deepEqual(extractTableOfContents(html), [
    { id: "real", level: 2, title: "Real" },
  ]);
});

test("keeps duplicate ids in document order", () => {
  const html = '<h2 id="dup">First</h2><h3 id="dup">Second</h3>';

  assert.deepEqual(extractTableOfContents(html), [
    { id: "dup", level: 2, title: "First" },
    { id: "dup", level: 3, title: "Second" },
  ]);
});

test("returns an empty list for empty or heading-free input", () => {
  assert.deepEqual(extractTableOfContents(""), []);
  assert.deepEqual(extractTableOfContents("<p>Just a paragraph.</p>"), []);
});

test("matches a structured article document", () => {
  const html = [
    '<h1 id="page">Guide</h1>',
    "<p>Body.</p>",
    '<h2 id="getting-started">Getting started</h2>',
    '<h3 id="install">Install &amp; run</h3>',
    '<h4 id="config"><code>config.ts</code> reference</h4>',
    '<h2 id="api">API</h2>',
    '<h3 id="options">Options</h3>',
    "<h2>No identifier</h2>",
    '<h6 id="footer">Footnotes</h6>',
  ].join("\n");

  assertGoldenJson(
    extractTableOfContents(html),
    new URL("./__golden__/toc.json", import.meta.url),
  );
});
