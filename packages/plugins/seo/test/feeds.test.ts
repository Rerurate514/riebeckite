import assert from "node:assert/strict";
import { test } from "node:test";
import { type ResolvedRiebeckiteConfig, resolveConfig } from "@riebeckite/core";
import { assertGolden } from "@riebeckite/test";
import {
  type RenderableFeedEntry,
  renderAtomFeed,
  renderJsonFeed,
  renderRssFeed,
} from "../index.ts";

const config: ResolvedRiebeckiteConfig = resolveConfig({
  site: {
    title: "Riebeckite",
    baseUrl: "https://example.com",
    locale: "en_US",
    feed: {
      title: "Riebeckite Notes",
      description: "Thoughts & notes",
      language: "en-US",
    },
  },
});

function entry(
  slug: string,
  overrides: Partial<RenderableFeedEntry> = {},
): RenderableFeedEntry {
  const permalink = `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter: {},
    html: "",
    publishing: { visibility: "public", routable: true, discoverable: true },
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
    ...overrides,
  };
}

test("renderRssFeed escapes text and formats the publication date", () => {
  const xml = renderRssFeed(config, [
    entry("posts/hello", {
      title: "A & B <tag>",
      frontmatter: { description: 'Desc "quoted"', published: "2024-01-02" },
    }),
    entry("posts/plain"),
  ]);

  assert.match(xml, /<title>A &amp; B &lt;tag&gt;<\/title>/);
  assert.match(xml, /<description>Desc &quot;quoted&quot;<\/description>/);
  assert.match(xml, /<pubDate>Tue, 02 Jan 2024 00:00:00 GMT<\/pubDate>/);
  assert.equal((xml.match(/<item>/g) ?? []).length, 2);
  assert.match(xml, /<description>Thoughts &amp; notes<\/description>/);
  assert.doesNotMatch(xml, /<pubDate>\s*<\/pubDate>/);

  assertGolden(xml, new URL("./__golden__/rss.xml", import.meta.url));
});

test("renderAtomFeed uses the most recent update and falls back to the epoch", () => {
  const dated = renderAtomFeed(config, [
    entry("posts/hello", {
      title: "Hello",
      frontmatter: { published: "2024-01-02T00:00:00.000Z" },
    }),
  ]);
  assert.match(dated, /<updated>2024-01-02T00:00:00.000Z<\/updated>/);

  const empty = renderAtomFeed(config, [
    entry("posts/hello", { title: "Hello" }),
  ]);
  assert.equal(
    (empty.match(/<updated>1970-01-01T00:00:00.000Z<\/updated>/g) ?? []).length,
    2,
  );

  assertGolden(
    renderAtomFeed(config, [
      entry("posts/hello", {
        title: "Hello",
        frontmatter: { updated: "2024-03-04T05:06:07.000Z" },
      }),
    ]),
    new URL("./__golden__/atom.xml", import.meta.url),
  );
});

test("renderJsonFeed emits JSON Feed 1.1 and omits undefined fields", () => {
  const json = renderJsonFeed(config, [
    entry("posts/hello", {
      title: "Hello",
      html: "<p>Body</p>",
      frontmatter: {
        description: "Summary",
        published: "2024-01-02T00:00:00.000Z",
        updated: "2024-02-03T00:00:00.000Z",
        tags: ["a", "", "b"],
      },
    }),
    entry("posts/empty", { title: "Empty" }),
  ]);

  const parsed = JSON.parse(json);
  assert.equal(parsed.version, "https://jsonfeed.org/version/1.1");
  assert.equal(parsed.home_page_url, "https://example.com/");
  assert.equal(parsed.feed_url, "https://example.com/feed.json");
  assert.equal(parsed.language, "en-US");
  assert.deepEqual(parsed.items[0], {
    id: "https://example.com/posts/hello",
    url: "https://example.com/posts/hello",
    title: "Hello",
    content_html: "<p>Body</p>",
    summary: "Summary",
    date_published: "2024-01-02T00:00:00.000Z",
    date_modified: "2024-02-03T00:00:00.000Z",
    tags: ["a", "b"],
  });
  assert.equal(parsed.items[1].content_html, "");
  assert.equal("date_published" in parsed.items[1], false);

  assertGolden(json, new URL("./__golden__/feed.json", import.meta.url));
});
