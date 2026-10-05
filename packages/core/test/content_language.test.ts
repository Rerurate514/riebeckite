import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getEntryLanguage,
  selectEntriesByLanguage,
} from "../src/content/content_language.js";
import type { ContentManifestEntry } from "../src/types/content_manifest.js";

test("returns every entry when no language is requested", () => {
  const entries = [entry("en/a", "en"), entry("ja/a", "ja"), entry("plain")];

  assert.deepEqual(selectEntriesByLanguage(entries, undefined), entries);
});

test("returns every entry when no entry carries a language", () => {
  const entries = [entry("guide"), entry("about")];

  assert.deepEqual(selectEntriesByLanguage(entries, "ja"), entries);
});

test("selects only the requested language", () => {
  const entries = [
    entry("en/a", "en"),
    entry("en/b", "en"),
    entry("ja/a", "ja"),
    entry("ja/b", "ja"),
  ];

  assert.deepEqual(
    selectEntriesByLanguage(entries, "ja").map((item) => item.slug),
    ["ja/a", "ja/b"],
  );
});

test("switches between languages", () => {
  const entries = [entry("en/a", "en"), entry("ja/a", "ja")];

  assert.deepEqual(
    selectEntriesByLanguage(entries, "en").map((item) => item.slug),
    ["en/a"],
  );
  assert.deepEqual(
    selectEntriesByLanguage(entries, "ja").map((item) => item.slug),
    ["ja/a"],
  );
});

test("does not reimplement publishing state", () => {
  const entries = [entry("en/draft", "en"), entry("en/public", "en")];

  assert.deepEqual(
    selectEntriesByLanguage(entries, "en").map((item) => item.slug),
    ["en/draft", "en/public"],
  );
});

test("reads the language from the public location", () => {
  assert.equal(getEntryLanguage(entry("en/a", "en")), "en");
  assert.equal(getEntryLanguage(entry("plain")), undefined);
});

function entry(slug: string, language?: string): ContentManifestEntry {
  return {
    slug,
    permalink: `/${slug}`,
    publicLocation: { slug, permalink: `/${slug}`, language },
    title: slug,
    aliases: [],
    frontmatter: {},
    publishing: { visibility: "public", routable: true, discoverable: true },
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}
