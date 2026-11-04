import assert from "node:assert/strict";
import { test } from "node:test";
import {
  localizedPagePath,
  localizedPagePaths,
  resolvePageLocale,
  selectLocalizedEntries,
} from "../src/content/content_language.js";
import { queryContentEntries } from "../src/content/content_query.js";
import type { ContentManifestEntry } from "../src/types/content_manifest.js";

function entry(
  slug: string,
  language?: string,
  translationId?: string,
): ContentManifestEntry {
  return {
    slug,
    permalink: `/${slug}`,
    publicLocation: {
      slug,
      permalink: `/${slug}`,
      ...(language ? { language } : {}),
      ...(translationId
        ? { metadata: { "l10n.translationId": translationId } }
        : {}),
    },
    title: slug,
    frontmatter: {},
    publishing: { visibility: "public", routable: true, discoverable: true },
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}

test("all returns every entry without deduplicating translations", () => {
  const entries = [
    entry("a", "ja", "a"),
    entry("a.en", "en", "a"),
    entry("b", "ja", "b"),
  ];
  assert.deepEqual(
    selectLocalizedEntries(entries, { mode: "all", locale: "ja" }),
    entries,
  );
});

test("current keeps the page language and language-neutral entries", () => {
  const entries = [
    entry("a", "ja", "a"),
    entry("a.en", "en", "a"),
    entry("plain"),
  ];
  assert.deepEqual(
    selectLocalizedEntries(entries, { mode: "current", locale: "ja" }).map(
      (item) => item.slug,
    ),
    ["a", "plain"],
  );
});

test("fallback uses the fallback locale only for missing translations", () => {
  const entries = [
    entry("a", "ja", "a"),
    entry("a.en", "en", "a"),
    entry("b.en", "en", "b"),
    entry("c.fr", "fr", "c"),
  ];
  assert.deepEqual(
    selectLocalizedEntries(entries, {
      mode: "fallback",
      locale: "ja",
      fallbackLocale: "en",
    }).map((item) => item.slug),
    ["a", "b.en"],
  );
});

test("fallback never merges entries without a translation identity", () => {
  const entries = [entry("a.en", "en"), entry("b.en", "en")];
  assert.deepEqual(
    selectLocalizedEntries(entries, {
      mode: "fallback",
      locale: "ja",
      fallbackLocale: "en",
    }).map((item) => item.slug),
    ["a.en", "b.en"],
  );
});

test("a locale-free site is returned unchanged", () => {
  const entries = [entry("a"), entry("b")];
  assert.deepEqual(
    selectLocalizedEntries(entries, {
      mode: "fallback",
      locale: "ja",
      fallbackLocale: "en",
    }),
    entries,
  );
});

test("duplicate translations in one locale stay visible deterministically", () => {
  const entries = [
    entry("a", "ja", "same"),
    entry("b", "ja", "same"),
    entry("a.en", "en", "same"),
  ];
  assert.deepEqual(
    selectLocalizedEntries(entries, {
      mode: "fallback",
      locale: "ja",
      fallbackLocale: "en",
    }).map((item) => item.slug),
    ["a", "b"],
  );
});

test("Content Query applies the locale policy before filtering", () => {
  const entries = [
    entry("a", "ja", "a"),
    entry("a.en", "en", "a"),
    entry("b.en", "en", "b"),
  ];
  assert.deepEqual(
    queryContentEntries(entries, {
      filter: { locale: { mode: "current", locale: "ja" } },
    }).map((item) => item.slug),
    ["a"],
  );
});

test("page locale and localized paths use the manifest contract", () => {
  const manifest = {
    localization: {
      defaultLocale: "ja",
      locales: ["ja", "en"],
      fallbackLocale: "en",
    },
  };
  assert.equal(resolvePageLocale(manifest, "/timeline"), "ja");
  assert.equal(resolvePageLocale(manifest, "/en/timeline"), "en");
  assert.equal(resolvePageLocale(manifest, "/EN/timeline"), "en");
  assert.deepEqual(localizedPagePaths(manifest, "/timeline"), [
    "/timeline",
    "/en/timeline",
  ]);
  assert.equal(
    localizedPagePath(manifest.localization, "/timeline", "en"),
    "/en/timeline",
  );
  assert.equal(resolvePageLocale({}, "/en/timeline"), undefined);
});
