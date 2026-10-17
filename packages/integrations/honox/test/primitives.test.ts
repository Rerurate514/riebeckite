import assert from "node:assert/strict";
import { test } from "node:test";
import { html as rawHtml } from "hono/html";
import { createElement, Fragment } from "hono/jsx";
import { renderToReadableStream, renderToString } from "hono/jsx/dom/server";
import TableOfContents from "../../../plugins/toc/components/table-of-contents.tsx";
import {
  Article,
  ArticleBody,
  ArticleContent,
  ArticleLayout,
  ArticleMeta,
  HtmlFragment,
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

test("ArticleLayout and ArticleContent render their children", () => {
  const html = renderToString(
    ArticleLayout({ children: ArticleContent({ children: "Body" }) }),
  );
  assert.equal(
    html,
    '<div class="rb-article-layout"><div class="rb-article-body" data-slot="article-body">Body</div></div>',
  );
});

test("ArticleBody owns the rb-article-content markdown hook", () => {
  const html = renderToString(ArticleBody({ html: "<p>Body</p>" }));
  assert.match(html, /^<div class="rb-article-content">/);
  assert.match(html, /<p>Body<\/p>/);
});

test("Article provides its post to contextual plugin components", async () => {
  const Empty = async () => rawHtml``;
  const element = createElement(
    Article,
    {
      post: {
        frontmatter: {},
        html: '<h2 id="first">First</h2><h2 id="second">Second</h2>',
      },
    },
    createElement(Empty, {}),
    createElement(TableOfContents, {}),
  );
  const html = await new Response(await renderToReadableStream(element)).text();

  assert.match(html, /rr-table-of-contents/);
});

test("ArticleBody composes a Site class after the markdown hook", () => {
  const html = renderToString(
    ArticleBody({ html: "<p>Body</p>", class: "site-article__body" }),
  );
  assert.match(html, /^<div class="rb-article-content site-article__body">/);
});

test("HtmlFragment renders trusted pipeline HTML without a wrapper", () => {
  const html = renderToString(
    HtmlFragment({ html: "<p>Fragment</p>", source: "markdown" }),
  );
  assert.equal(html, "<p>Fragment</p>");
});

test("PageBody owns the rb-page-body hook", () => {
  const html = renderToString(PageBody({ html: "<p>Page</p>" }));
  assert.equal(html, '<div class="rb-page-body"><p>Page</p></div>');
});

test("PageBody composes a Site class", () => {
  const html = renderToString(
    PageBody({ html: "<p>Page</p>", class: "site-page" }),
  );
  assert.equal(html, '<div class="rb-page-body site-page"><p>Page</p></div>');
});
