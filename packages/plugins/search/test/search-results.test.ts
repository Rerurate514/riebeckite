import assert from "node:assert/strict";
import test from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import type { SearchResult } from "../src/search.js";
import { SearchResults } from "../src/search-results.js";

const result: SearchResult = {
  slug: "alpha",
  permalink: "/notes/alpha",
  title: "Alpha Note",
  aliases: [],
  headings: [],
  body: "Alpha body about obsidian.",
  excerpt: "Alpha excerpt about obsidian.",
  tags: ["obsidian", "notes"],
  language: "en",
  date: "2024-01-02",
  score: 10,
  match: { field: "title", value: "Alpha Note", score: 10, index: 0 },
};

test("renders results as options with the selected item marked", () => {
  const html = renderToString(
    SearchResults({ results: [result], selectedIndex: 0, query: "alpha" }),
  );

  assert.match(html, /class="rr-search-result"/);
  assert.match(html, /href="\/notes\/alpha"/);
  assert.match(html, /data-search-result="true"/);
  assert.match(html, /role="option"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /<mark class="rr-search-result__mark">Alpha<\/mark>/);
  assert.match(html, /2024\/01\/02 · alpha/);
  assert.match(html, /#obsidian/);
});

test("renders an icon, body excerpt, and unselected state", () => {
  const bodyResult: SearchResult = {
    ...result,
    icon: { id: "alpha", kind: "svg", html: '<svg data-icon="alpha"></svg>' },
    tags: [],
    match: {
      field: "body",
      value: "0123456789 Alpha body about obsidian.",
      score: 5,
      index: 11,
    },
  };
  const html = renderToString(
    SearchResults({ results: [bodyResult], selectedIndex: 1, query: "alpha" }),
  );

  assert.match(html, /aria-selected="false"/);
  assert.match(
    html,
    /<span class="rr-search-result__icon" aria-hidden="true"><svg data-icon="alpha"><\/svg><\/span>/,
  );
  assert.match(html, /body about obsidian\./);
  assert.doesNotMatch(html, /rr-search-result__tags/);
});
