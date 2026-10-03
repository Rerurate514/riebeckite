import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findSmart404Candidates,
  normalizeSearchQuery,
  normalizeSearchText,
  parseSearchQuery,
  type SearchItem,
  searchItems,
  searchQueryFromPath,
} from "../src/search.ts";

function item(overrides: Partial<SearchItem> = {}): SearchItem {
  return {
    slug: "s",
    permalink: "/s",
    title: "",
    aliases: [],
    headings: [],
    body: "",
    excerpt: "",
    tags: [],
    date: null,
    ...overrides,
  };
}

test("normalizeSearchText lowercases, NFKC-normalizes, and folds katakana", () => {
  assert.equal(normalizeSearchText("Search"), "search");
  assert.equal(normalizeSearchText("ＡＢＣ"), "abc");
  assert.equal(normalizeSearchText("カタカナ"), "かたかな");
  assert.equal(normalizeSearchText("ﾊﾝｶｸ"), "はんかく");
});

test("normalizeSearchQuery strips leading hashes after normalization", () => {
  assert.equal(normalizeSearchQuery("#Tag"), "tag");
  assert.equal(normalizeSearchQuery("##タグ"), "たぐ");
  assert.equal(normalizeSearchQuery("#"), "");
});

test("parseSearchQuery separates supported filters from text", () => {
  assert.deepEqual(parseSearchQuery("riverpod tag:flutter lang:ja"), {
    raw: "riverpod tag:flutter lang:ja",
    text: "riverpod",
    filters: [
      { field: "tag", value: "flutter" },
      { field: "lang", value: "ja" },
    ],
  });
});

test("parseSearchQuery leaves unknown and incomplete filters in the text", () => {
  assert.deepEqual(parseSearchQuery("type:article tag:"), {
    raw: "type:article tag:",
    text: "type:article tag:",
    filters: [],
  });
});

test("searchItems returns nothing for an empty or hash-only query", () => {
  assert.deepEqual(searchItems([item({ title: "Alpha" })], ""), []);
  assert.deepEqual(searchItems([item({ title: "Alpha" })], "#"), []);
});

test("an exact field match scores weight times three", () => {
  const title = searchItems([item({ title: "Alpha" })], "alpha")[0];
  assert.ok(title);
  assert.equal(title.score, 168);
  assert.deepEqual(title.match, {
    field: "title",
    value: "Alpha",
    score: 168,
    index: 0,
  });

  const tag = searchItems([item({ tags: ["Tag"] })], "tag")[0];
  assert.equal(tag?.score, 132);
  assert.equal(tag?.match.field, "tags");

  const slug = searchItems([item({ slug: "guide" })], "guide")[0];
  assert.equal(slug?.score, 192);
  assert.equal(slug?.match.field, "slug");

  const alias = searchItems([item({ aliases: ["Legacy Guide"] })], "legacy")[0];
  assert.equal(alias?.match.field, "aliases");
});

test("searchItems applies tag, language, and normalized path filters", () => {
  const items = [
    item({
      slug: "docs/flutter/riverpod",
      title: "Riverpod",
      tags: ["flutter"],
      language: "ja",
    }),
    item({
      slug: "guides/flutter/riverpod",
      title: "Riverpod English",
      tags: ["flutter"],
      language: "en",
    }),
  ];

  assert.deepEqual(
    searchItems(items, "tag:flutter").map((result) => result.slug),
    ["docs/flutter/riverpod", "guides/flutter/riverpod"],
  );
  assert.deepEqual(
    searchItems(items, "lang:ja").map((result) => result.slug),
    ["docs/flutter/riverpod"],
  );
  assert.deepEqual(
    searchItems(items, "path:docs\\flutter").map((result) => result.slug),
    ["docs/flutter/riverpod"],
  );
});

test("searchItems combines text and multiple filters with AND semantics", () => {
  const results = searchItems(
    [
      item({
        slug: "docs/flutter/riverpod",
        title: "Riverpod",
        tags: ["flutter"],
        language: "ja",
      }),
      item({
        slug: "docs/flutter/provider",
        title: "Provider",
        tags: ["flutter"],
        language: "ja",
      }),
    ],
    "riverpod tag:flutter lang:ja path:docs",
  );

  assert.deepEqual(
    results.map((result) => result.slug),
    ["docs/flutter/riverpod"],
  );
});

test("a prefix match scores double and an inner match scores single weight", () => {
  const prefix = searchItems([item({ title: "Alpha Beta" })], "alpha")[0];
  assert.equal(prefix?.score, 112);
  assert.equal(prefix?.match.index, 0);

  const inner = searchItems([item({ title: "Alpha Beta" })], "beta")[0];
  assert.equal(inner?.score, 56);
  assert.equal(inner?.match.index, 6);
});

test("the total score sums every matching field and keeps the best match", () => {
  const result = searchItems(
    [item({ title: "Alpha", tags: ["Alpha"], body: "alpha here" })],
    "alpha",
  )[0];

  assert.equal(result?.score, 320);
  assert.equal(result?.match.field, "title");
});

test("fuzzy matching only applies from two characters and reports index -1", () => {
  const fuzzy = searchItems([item({ title: "Alpha" })], "alpa")[0];
  assert.equal(fuzzy?.match.field, "title");
  assert.equal(fuzzy?.match.index, -1);
  assert.equal(fuzzy?.score, 36);

  assert.deepEqual(searchItems([item({ title: "Alpha" })], "z"), []);
});

test("results rank by score and break ties by Japanese title order", () => {
  const ranked = searchItems(
    [item({ title: "Body", body: "needle" }), item({ title: "Needle" })],
    "needle",
  );
  assert.deepEqual(
    ranked.map((result) => result.title),
    ["Needle", "Body"],
  );

  const tied = searchItems(
    [item({ title: "B", body: "xx" }), item({ title: "A", body: "xx" })],
    "xx",
  );
  assert.deepEqual(
    tied.map((result) => result.title),
    ["A", "B"],
  );
});

test("Smart 404 normalizes paths and limits high-quality search candidates", () => {
  assert.equal(
    searchQueryFromPath("/guides/flutter-state-management/index.html/"),
    "guides flutter state management",
  );
  assert.equal(
    searchQueryFromPath("/guides/%E3%83%86%E3%82%B9%E3%83%88"),
    "guides テスト",
  );

  const candidates = findSmart404Candidates(
    [
      item({ title: "Flutter", permalink: "/guides/flutter" }),
      item({ title: "Private", permalink: "/private-page" }),
    ],
    "/guides/fluter/",
    { limit: 2 },
  );
  assert.deepEqual(candidates, [
    { title: "Flutter", permalink: "/guides/flutter" },
  ]);
  assert.deepEqual(
    findSmart404Candidates([item({ title: "Unrelated" })], "/does-not-exist"),
    [],
  );
});

test("Smart 404 ranks aliases and the requested locale before other languages", () => {
  const candidates = findSmart404Candidates(
    [
      item({
        title: "Dependency Injection",
        permalink: "/en/dependency-injection",
        aliases: ["Dependency Injection Guide"],
      }),
      item({
        title: "依存性の注入",
        permalink: "/ja/dependency-injection",
        aliases: ["Dependency Injection Guide"],
      }),
    ],
    "/ja/dependency-injection-guide",
    { language: "ja" },
  );
  assert.deepEqual(
    candidates.map((candidate) => candidate.permalink),
    ["/ja/dependency-injection", "/en/dependency-injection"],
  );
});
