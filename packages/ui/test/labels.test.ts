import assert from "node:assert/strict";
import { test } from "node:test";
import { createUiLabelContext } from "@riebeckite/core";
import {
  defineUiLabels,
  resolveClientUiLabels,
  resolveUiLabels,
  resolveUiLabelsWithTrace,
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
  assert.equal(resolveUiLabels(labels, { language: "JA" }).search, "検索");
});

test("falls back to English for unknown languages", () => {
  assert.equal(resolveUiLabels(labels, { language: "fr" }).search, "Search");
});

test("applies overrides only for the matching namespace and language", () => {
  const resolved = resolveUiLabels(labels, {
    language: "ja",
    overrides: {
      example: { ja: { search: "ノート検索" } },
      other: { ja: { search: "ignored" } },
    },
  });
  assert.equal(resolved.search, "ノート検索");
  assert.equal(resolved.showing, "{total} 件中 {shown} 件を表示");
});

test("ignores empty and non-string overrides", () => {
  const resolved = resolveUiLabels(labels, {
    language: "ja",
    overrides: { example: { ja: JSON.parse('{"search":"","showing":1}') } },
  });
  assert.equal(resolved.search, "検索");
  assert.equal(resolved.showing, "{total} 件中 {shown} 件を表示");
});

test("ignores dictionaries and overrides with keys outside English", () => {
  const extra = defineUiLabels("example-extra", {
    en: { search: "Search" },
    ja: { search: "検索", stray: "放り込まれたキー" },
  });
  const resolved = resolveUiLabels(labels, {
    language: "ja",
    overrides: { example: { ja: { search: "ノート検索", unknown: "無視" } } },
  });
  assert.equal(resolved.search, "ノート検索");
  assert.deepEqual(Object.keys(resolved), Object.keys(labels.dictionaries.en));
  assert.deepEqual(Object.keys(resolveUiLabels(extra, { language: "ja" })), [
    "search",
  ]);
});

test("keeps template placeholders in plugin dictionaries", () => {
  assert.equal(labels.dictionaries.en.showing, "showing {shown} of {total}");
});

test("matches a primary subtag when the full locale differs", () => {
  assert.equal(resolveUiLabels(labels, { language: "ja-JP" }).search, "検索");
  assert.equal(resolveUiLabels(labels, { language: "en_US" }).search, "Search");
});

test("prefers an exact locale over the primary subtag", () => {
  const regional = defineUiLabels("regional", {
    en: { label: "English" },
    pt: { label: "Português" },
    "pt-BR": { label: "Português (BR)" },
  });
  assert.equal(
    resolveUiLabels(regional, { language: "pt-BR" }).label,
    "Português (BR)",
  );
  assert.equal(
    resolveUiLabels(regional, { language: "pt-PT" }).label,
    "Português",
  );
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

test("traces the dictionary and override used for each label", () => {
  const resolution = resolveUiLabelsWithTrace(labels, {
    language: "ja-JP",
    overrides: { example: { ja: { search: "サイト検索" } } },
  });
  assert.equal(resolution.builtInLocale, "ja");
  assert.equal(resolution.overrideLocale, "ja");
  assert.equal(resolution.sources.search, "override");
  assert.equal(resolution.sources.showing, "built-in");
});

test("site locale takes priority over the output language", () => {
  const context = createUiLabelContext(
    {
      ui: {
        locale: "ja",
        labels: { example: { ja: { search: "サイト検索" } } },
      },
    },
    "en",
  );
  assert.equal(resolveUiLabels(labels, context).search, "サイト検索");
});
