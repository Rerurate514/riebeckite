import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findSmart404Candidates,
  normalizeSearchQuery,
  normalizeSearchText,
  type SearchItem,
  searchItems,
  searchQueryFromPath,
} from "../src/search.ts";

function item(overrides: Partial<SearchItem> = {}): SearchItem {
  return {
    slug: "s",
    permalink: "/s",
    title: "",
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
