import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type PostContent,
  type ResolvedRiebeckiteConfig,
  resolveConfig,
} from "@riebeckite/core";
import { assertGoldenJson } from "@riebeckite/test";
import { buildArticleSeo, buildWebsiteSeo } from "../index.ts";

const config: ResolvedRiebeckiteConfig = resolveConfig({
  site: {
    title: "Riebeckite",
    description: "Site description",
    author: "Ada",
    baseUrl: "https://example.com",
    locale: "en_US",
    defaultOgImage: "/static/og.png",
    feed: {
      title: "Feed title",
      description: "Feed description",
      language: "en-US",
    },
  },
  content: { filters: { publishStrategy: "explicit" } },
});

function post(
  frontmatter: PostContent["frontmatter"],
  html: string,
): PostContent {
  return { frontmatter, html };
}

test("buildArticleSeo composes metadata, tags, reading time, and JSON-LD", () => {
  const result = buildArticleSeo(
    config,
    { siteName: "Custom Site" },
    "/posts/hello",
    post(
      {
        title: "Hello <World>",
        description: "A description",
        published: "2024-01-01T00:00:00.000Z",
        updated: "2024-02-01T00:00:00.000Z",
        tags: ["a", "", "b"],
        ogImage: "/img/cover.png",
      },
      "<p>Some content here.</p>",
    ),
  );

  assert.equal(result.title, "Hello <World> | Custom Site");
  assert.equal(result.description, "A description");
  assert.equal(result.canonicalUrl, "https://example.com/posts/hello");
  assert.equal(result.imageUrl, "https://example.com/img/cover.png");
  assert.equal(result.type, "article");
  assert.equal(result.noindex, false);
  assert.deepEqual(result.tags, ["a", "b"]);
  assert.equal(result.readingTimeMinutes, 1);
  assert.deepEqual(result.jsonLd?.[0], {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "Hello <World>",
    description: "A description",
    url: "https://example.com/posts/hello",
    image: ["https://example.com/img/cover.png"],
    datePublished: "2024-01-01T00:00:00.000Z",
    dateModified: "2024-02-01T00:00:00.000Z",
    author: { "@type": "Person", name: "Ada" },
    publisher: { "@type": "Organization", name: "Custom Site" },
    keywords: "a, b",
    timeRequired: "PT1M",
    inLanguage: "en-US",
  });

  assertGoldenJson(
    result,
    new URL("./__golden__/article-seo.json", import.meta.url),
  );
});

test("buildArticleSeo falls back to slug, site description, and default image", () => {
  const result = buildArticleSeo(
    config,
    { defaultImage: "/default.png" },
    "/blog/my-post",
    post({ noindex: true, canonical: "https://other.example/x" }, ""),
  );

  assert.equal(result.title, "my-post | Riebeckite");
  assert.equal(result.description, "Site description");
  assert.equal(result.canonicalUrl, "https://other.example/x");
  assert.equal(result.imageUrl, "https://example.com/default.png");
  assert.equal(result.noindex, true);
  assert.equal(result.publishedTime, undefined);
  assert.equal(result.modifiedTime, undefined);
  assert.deepEqual(result.tags, []);
  assert.equal(result.jsonLd?.[0]?.datePublished, undefined);
  assert.equal(result.jsonLd?.[0]?.dateModified, undefined);
});

test("buildArticleSeo uses the last permalink segment and treats a title equal to the site name specially", () => {
  assert.equal(
    buildArticleSeo(config, {}, "/deep/nested/leaf", post({}, "")).title,
    "leaf | Riebeckite",
  );
  assert.equal(
    buildArticleSeo(config, {}, "/anything", post({ title: "Riebeckite" }, ""))
      .title,
    "Riebeckite",
  );
});

test("buildWebsiteSeo keeps tag titles and labels website titles", () => {
  const tag = buildWebsiteSeo(
    config,
    {},
    {
      kind: "tag",
      title: "Tag: testing",
      path: "/tags/testing",
    },
  );
  assert.equal(tag.title, "Tag: testing");
  assert.equal(tag.type, "website");
  assert.equal(tag.canonicalUrl, "https://example.com/tags/testing");
  assert.equal(tag.imageUrl, "https://example.com/static/og.png");
  assert.equal(tag.description, "Site description");

  const index = buildWebsiteSeo(
    config,
    {},
    {
      kind: "index",
      title: "Notes",
      path: "/notes",
    },
  );
  assert.equal(index.title, "Notes | Riebeckite");

  assertGoldenJson(
    index,
    new URL("./__golden__/website-seo.json", import.meta.url),
  );
});

test("buildWebsiteSeo breadcrumbs contain only the site root", () => {
  const result = buildWebsiteSeo(
    config,
    {},
    {
      title: "Notes",
      path: "/notes",
      description: "Custom",
    },
  );

  assert.equal(result.description, "Custom");
  assert.deepEqual(result.jsonLd?.[1], {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Riebeckite",
        item: "https://example.com/",
      },
    ],
  });
});
