import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defineUiLabels,
  resolveClientUiLabels,
  resolveUiLabels,
} from "../labels.js";

const labels = defineUiLabels("example", {
  en: {
    search: "Search",
    showing: "showing {shown} of {total}",
  },
  ja: {
    search: "検索",
    showing: "{total} 件中 {shown} 件を表示",
  },
});

test("returns English without a language", () => {
  assert.deepEqual(resolveUiLabels(labels, undefined), {
    search: "Search",
    showing: "showing {shown} of {total}",
  });
});

test("uses the matching dictionary case-insensitively", () => {
  assert.equal(resolveUiLabels(labels, "JA").search, "検索");
});

test("falls back to English for unknown languages", () => {
  assert.equal(resolveUiLabels(labels, "fr").search, "Search");
});

test("applies overrides only for the matching namespace and language", () => {
  const resolved = resolveUiLabels(labels, "ja", {
    example: { ja: { search: "ノート検索" } },
    other: { ja: { search: "ignored" } },
  });
  assert.equal(resolved.search, "ノート検索");
  assert.equal(resolved.showing, "{total} 件中 {shown} 件を表示");
});

test("ignores empty and non-string overrides", () => {
  const resolved = resolveUiLabels(labels, "ja", {
    example: { ja: JSON.parse('{"search":"","showing":1}') },
  });
  assert.equal(resolved.search, "検索");
  assert.equal(resolved.showing, "{total} 件中 {shown} 件を表示");
});

test("keeps template placeholders in plugin dictionaries", () => {
  assert.equal(labels.dictionaries.en.showing, "showing {shown} of {total}");
});

test("matches a primary subtag when the full locale differs", () => {
  assert.equal(resolveUiLabels(labels, "ja-JP").search, "検索");
  assert.equal(resolveUiLabels(labels, "en_US").search, "Search");
});

test("prefers an exact locale over the primary subtag", () => {
  const regional = defineUiLabels("regional", {
    en: { label: "English" },
    pt: { label: "Português" },
    "pt-BR": { label: "Português (BR)" },
  });
  assert.equal(resolveUiLabels(regional, "pt-BR").label, "Português (BR)");
  assert.equal(resolveUiLabels(regional, "pt-PT").label, "Português");
});

test("client labels use the site locale and overrides", () => {
  globalThis.__riebeckiteUi = {
    locale: "ja-JP",
    labels: { example: { ja: { search: "サイト検索" } } },
  };
  try {
    assert.equal(resolveClientUiLabels(labels).search, "サイト検索");
  } finally {
    globalThis.__riebeckiteUi = undefined;
  }
});
