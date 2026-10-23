import assert from "node:assert/strict";
import { test } from "node:test";
import type { PostContent } from "@riebeckite/core";
import { ArticleProvider } from "@riebeckite/ui";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import ArticleMetadata from "../components/article-metadata.js";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

function render(post: PostContent): string {
  return renderToString(
    createElement(
      ArticleProvider,
      { post },
      createElement(ArticleMetadata, { locale: "ja-JP" }),
    ),
  );
}

function post(overrides: Partial<PostContent> = {}): PostContent {
  return {
    slug: "note",
    frontmatter: {},
    html: "<p>Hello world.</p>",
    ...overrides,
  } as PostContent;
}

test("ArticleMetadata renders dates, reading time, and plain tags without a site", () => {
  const html = render(
    post({
      frontmatter: {
        published: "2026-04-03",
        updated: "2026-05-01",
        tags: ["Release Notes", 42, "  "] as unknown as string[],
      },
    }),
  );

  assert.match(html, /rr-article-metadata/);
  assert.match(html, /PUBLISHED/);
  assert.match(html, /UPDATED/);
  assert.match(html, /READ/);
  assert.match(html, /#Release Notes/);
  assert.doesNotMatch(html, /href=/);
});

test("ArticleMetadata renders nothing outside the article context", () => {
  assert.equal(renderToString(createElement(ArticleMetadata, {})), "");
});
