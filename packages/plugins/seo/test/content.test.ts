import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifestEntry,
  type PostContent,
  type ResolvedRiebeckiteConfig,
  resolveConfig,
} from "@riebeckite/core";
import {
  filterFeedEntries,
  getDescription,
  getEntryPublishedTime,
  getEntryUpdatedTime,
  getHtmlLanguage,
} from "../index.ts";
import { normalizeTags } from "../src/content.ts";

const config: ResolvedRiebeckiteConfig = resolveConfig({
  site: { title: "Test", locale: "en_US" },
  content: { filters: { publishStrategy: "explicit" } },
});

function entry(
  slug: string,
  overrides: Partial<ContentManifestEntry> = {},
): ContentManifestEntry {
  const permalink = `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter: {},
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
    ...overrides,
  };
}

function post(
  frontmatter: PostContent["frontmatter"],
  html: string,
): PostContent {
  return { frontmatter, html };
}

test("getDescription prefers a trimmed frontmatter description", () => {
  assert.equal(
    getDescription(post({ description: "  From frontmatter  " }, "<p>no</p>")),
    "From frontmatter",
  );
  assert.equal(
    getDescription(post({ description: "   " }, "<p>Fallback</p>")),
    "Fallback",
  );
});

test("getDescription strips markup, collapses whitespace, and truncates", () => {
  assert.equal(
    getDescription(
      post({}, "<p>Hello <strong>world</strong> &amp; friends</p>"),
    ),
    "Hello world &amp; friends",
  );

  const long = getDescription(post({}, `<p>${"a".repeat(200)}</p>`));
  assert.equal(long.length, 160);
  assert.equal(long, "a".repeat(160));
});

test("filterFeedEntries drops unpublished and noindex entries and sorts by recency", () => {
  const entries = [
    entry("a", {
      frontmatter: { publish: true, updated: "2024-01-03" },
    }),
    entry("b", {
      frontmatter: { publish: true, updated: "2024-01-05" },
    }),
    entry("c", { frontmatter: { publish: false } }),
    entry("d", { frontmatter: { publish: true, noindex: true } }),
    entry("e", { frontmatter: { publish: true, published: "2024-01-04" } }),
  ];

  assert.deepEqual(
    filterFeedEntries(config, entries).map((item) => item.slug),
    ["b", "e", "a"],
  );
});

test("getEntryPublishedTime applies published, date, and created precedence", () => {
  assert.equal(
    getEntryPublishedTime(
      entry("a", {
        frontmatter: { published: "2024-01-02", date: "2024-01-01" },
      }),
    ),
    "2024-01-02T00:00:00.000Z",
  );
  assert.equal(
    getEntryPublishedTime(
      entry("b", { frontmatter: { date: "2024-02-03T04:05:06.000Z" } }),
    ),
    "2024-02-03T04:05:06.000Z",
  );
  assert.equal(
    getEntryPublishedTime(
      entry("c", { frontmatter: { created: new Date("2024-03-04") } }),
    ),
    "2024-03-04T00:00:00.000Z",
  );
});

test("getEntryPublishedTime returns null for missing or invalid dates", () => {
  assert.equal(getEntryPublishedTime(entry("a")), null);
  assert.equal(
    getEntryPublishedTime(entry("b", { frontmatter: { date: "nope" } })),
    null,
  );
  assert.equal(
    getEntryPublishedTime(
      entry("c", {
        frontmatter: { published: "nope", date: "2024-01-01" },
      }),
    ),
    null,
  );
});

test("getEntryUpdatedTime falls back to the published time", () => {
  assert.equal(
    getEntryUpdatedTime(
      entry("a", {
        frontmatter: { updated: "2024-04-05", published: "2024-01-01" },
      }),
    ),
    "2024-04-05T00:00:00.000Z",
  );
  assert.equal(
    getEntryUpdatedTime(
      entry("b", { frontmatter: { published: "2024-01-01" } }),
    ),
    "2024-01-01T00:00:00.000Z",
  );
  assert.equal(getEntryUpdatedTime(entry("c")), null);
});

test("getHtmlLanguage converts locale underscores to hyphens", () => {
  assert.equal(getHtmlLanguage(config), "en-US");
  assert.equal(getHtmlLanguage(resolveConfig({ site: { title: "T" } })), "en");
});

test("normalizeTags keeps only non-blank string tags", () => {
  assert.deepEqual(normalizeTags(["a", "", "  ", 3, null, "b"]), ["a", "b"]);
  assert.deepEqual(normalizeTags(undefined), []);
  assert.deepEqual(normalizeTags("not-an-array"), []);
});
