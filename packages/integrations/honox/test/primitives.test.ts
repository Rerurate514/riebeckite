import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import {
  Article,
  ArticleBody,
  ArticleMeta,
  ContentSlot,
  hasSlot,
  PageBody,
} from "../src/ui/primitives.tsx";

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

test("ArticleBody owns the rb-article-content markdown hook", () => {
  const html = renderToString(ArticleBody({ html: "<p>Body</p>" }));

  assert.match(html, /^<div class="rb-article-content">/);
  assert.match(html, /<p>Body<\/p>/);
});

test("ArticleBody composes a Site class after the markdown hook", () => {
  const html = renderToString(
    ArticleBody({ html: "<p>Body</p>", class: "site-article__body" }),
  );

  assert.match(html, /^<div class="rb-article-content site-article__body">/);
});

test("ContentSlot renders nothing without a slots map", () => {
  const html = renderToString(ContentSlot({ name: "article.metadata" }));

  assert.equal(html, "");
});

test("ContentSlot renders nothing for a missing slot", () => {
  const html = renderToString(
    ContentSlot({ slots: {}, name: "article.metadata" }),
  );

  assert.equal(html, "");
});

test("ContentSlot renders nothing for an empty or whitespace-only slot", () => {
  assert.equal(
    renderToString(
      ContentSlot({
        slots: { "article.metadata": "" },
        name: "article.metadata",
      }),
    ),
    "",
  );
  assert.equal(
    renderToString(
      ContentSlot({
        slots: { "article.metadata": "  \n  " },
        name: "article.metadata",
      }),
    ),
    "",
  );
});

test("ContentSlot renders an HTML fragment in a data-slot wrapper", () => {
  const html = renderToString(
    ContentSlot({
      slots: { "article.metadata": "<p>Meta</p>" },
      name: "article.metadata",
    }),
  );

  assert.match(html, /^<div data-slot="article.metadata">/);
  assert.match(html, /<p>Meta<\/p>/);
});

test("ContentSlot composes a Site class", () => {
  const html = renderToString(
    ContentSlot({
      slots: { "article.metadata": "<p>Meta</p>" },
      name: "article.metadata",
      class: "site-article__metadata",
    }),
  );

  assert.match(
    html,
    /^<div data-slot="article.metadata" class="site-article__metadata">/,
  );
});

test("ContentSlot composes the React-style className prop too", () => {
  const html = renderToString(
    ContentSlot({
      slots: { "article.metadata": "<p>Meta</p>" },
      name: "article.metadata",
      className: "site-article__metadata",
    }),
  );

  assert.match(
    html,
    /^<div data-slot="article.metadata" class="site-article__metadata">/,
  );
});

test("ContentSlot accepts a custom slot name", () => {
  const html = renderToString(
    ContentSlot({
      slots: { "custom.slot": "<p>Custom</p>" },
      name: "custom.slot",
    }),
  );

  assert.match(html, /^<div data-slot="custom.slot">/);
});

test("hasSlot shares the ContentSlot empty semantics", () => {
  assert.equal(hasSlot(undefined, "article.footer"), false);
  assert.equal(hasSlot({}, "article.footer"), false);
  assert.equal(hasSlot({ "article.footer": "" }, "article.footer"), false);
  assert.equal(hasSlot({ "article.footer": "   " }, "article.footer"), false);
  assert.equal(
    hasSlot({ "article.footer": "<p>Footer</p>" }, "article.footer"),
    true,
  );
  assert.equal(
    hasSlot({ "custom.slot": "<p>Custom</p>" }, "custom.slot"),
    true,
  );
});

test("PageBody renders resolved page HTML in a bare wrapper", () => {
  const html = renderToString(PageBody({ html: "<p>Page</p>" }));

  assert.equal(html, "<div><p>Page</p></div>");
});

test("PageBody composes a Site class", () => {
  const html = renderToString(
    PageBody({ html: "<p>Page</p>", class: "site-page" }),
  );

  assert.equal(html, '<div class="site-page"><p>Page</p></div>');
});
