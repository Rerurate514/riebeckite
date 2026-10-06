import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import { Article, ArticleMeta } from "../src/ui/primitives.tsx";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

test("Article owns the rb-article hook by default", () => {
  const html = renderToString(Article({ children: "Body" }));

  assert.match(html, /^<article class="rb-article" data-slot="article">/);
});

test("Article composes the consumer class after the rb-article hook", () => {
  const html = renderToString(Article({ class: "fixture-article" }));

  assert.match(
    html,
    /^<article class="rb-article fixture-article" data-slot="article">/,
  );
  assert.doesNotMatch(html, /rb-article rb-article/);
});

test("Article composes the React-style className prop too", () => {
  const html = renderToString(Article({ className: "fixture-article" }));

  assert.match(
    html,
    /^<article class="rb-article fixture-article" data-slot="article">/,
  );
});

test("ArticleMeta owns the rb-article-meta hook", () => {
  const html = renderToString(ArticleMeta({ children: "Meta" }));

  assert.match(html, /^<aside class="rb-article-meta" /);
});
