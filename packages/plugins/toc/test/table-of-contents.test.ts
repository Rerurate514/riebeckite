import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertGoldenJson } from "@riebeckite/test";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import { extractTableOfContents, TableOfContents } from "../index.ts";

const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");

(globalThis as { React?: unknown }).React = { createElement, Fragment };

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

test("toggles the top and bottom rules independently", () => {
  const items = [
    { id: "intro", level: 2, title: "Intro" },
    { id: "api", level: 2, title: "API" },
  ];
  const bordered = renderToString(createElement(TableOfContents, { items }));
  const withoutTop = renderToString(
    createElement(TableOfContents, { items, borders: { blockStart: false } }),
  );
  const withoutBottom = renderToString(
    createElement(TableOfContents, { items, borders: { blockEnd: false } }),
  );

  assert.doesNotMatch(bordered, /without-(top|bottom)-border/);
  assert.match(withoutTop, /rr-table-of-contents--without-top-border/);
  assert.match(withoutBottom, /rr-table-of-contents--without-bottom-border/);
  assert.match(
    style,
    /\.rr-table-of-contents--without-top-border\s*\{[^}]*border-block-start:\s*0/,
  );
  assert.match(
    style,
    /\.rr-table-of-contents--without-bottom-border\s*\{[^}]*border-block-end:\s*0/,
  );
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
