import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  definePlugin,
  type RiebeckitePlugin,
  resolveConfig,
} from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import {
  getLocalization,
  getLocalizedContent,
  type L10nOptions,
  l10n,
} from "../index.js";

function source(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

function manager(
  files: Record<string, string>,
  options: Partial<L10nOptions> = {},
  additionalPlugins: readonly RiebeckitePlugin<unknown>[] = [],
  buildDirectory?: string,
) {
  return new ContentManager(source(files), [], {
    config: {
      ...resolveConfig({
        site: { title: "Test" },
        cache: buildDirectory
          ? { enabled: true, directory: path.join(buildDirectory, "cache") }
          : undefined,
        content: { filters: { publishStrategy: "selective" } },
      }),
      buildDirectory,
    },
    plugins: [
      ...additionalPlugins,
      l10n({
        defaultLang: "ja",
        languages: ["ja", "en", "en-US", "zh-CN"],
        ...options,
      }),
    ],
  });
}

test("detects configured filename conventions and leaves ordinary Markdown at the default language", async () => {
  const content = manager({
    "README.md": "# Default",
    "README.en.md": "# Dot",
    "README-en.md": "# Dash",
    "README_en.md": "# Underscore",
    "README.en-US.md": "# Region",
    "README.zh-CN.md": "# Chinese",
  });
  const locations = await content.getContentLocations();

  assert.equal(locations.get("README")?.metadata?.["l10n.lang"], "ja");
  assert.equal(locations.get("README.en")?.metadata?.["l10n.lang"], "en");
  assert.equal(locations.get("README-en")?.metadata?.["l10n.lang"], "en");
  assert.equal(locations.get("README_en")?.metadata?.["l10n.lang"], "en");
  assert.equal(locations.get("README.en-US")?.metadata?.["l10n.lang"], "en-US");
  assert.equal(locations.get("README.zh-CN")?.metadata?.["l10n.lang"], "zh-CN");
  assert.equal(
    locations.get("README.en")?.metadata?.["l10n.translationId"],
    "README",
  );
  assert.equal(locations.get("README.en")?.permalink, "/en/README");
  assert.equal(locations.get("README")?.permalink, "/README");
});

test("detects configured directory names and removes them from the derived translation identity", async () => {
  const content = manager({
    "en/README.md": "# English",
    "ja/README.md": "# Japanese",
  });
  const locations = await content.getContentLocations();
  assert.equal(locations.get("en/README")?.permalink, "/en/README");
  assert.equal(locations.get("ja/README")?.permalink, "/README");
  assert.equal(
    locations.get("en/README")?.metadata?.["l10n.translationId"],
    "README",
  );
});

test("localizes explicit redirect sources with their canonical permalink", async () => {
  const content = manager(
    {
      "guide.en.md": "# Guide",
    },
    {},
    [
      definePlugin({
        name: "test-redirects",
        resolveContentLocations: ({ entries }) =>
          entries.map((entry) => ({
            slug: entry.slug,
            permalink: "/guide",
            redirects: [{ path: "/old-guide", status: 308 }],
          })),
      }),
    ],
  );

  const manifest = await content.getManifest();
  assert.equal(manifest.bySlug.get("guide.en")?.permalink, "/en/guide");
  assert.deepEqual(manifest.redirects.get("/en/old-guide"), {
    path: "/en/old-guide",
    status: 308,
    slug: "guide.en",
  });
  assert.equal(manifest.redirects.has("/old-guide"), false);
});

test("frontmatter wins over filename and directory signals and exposes a conflict diagnostic", async () => {
  const content = manager(
    { "en/README.ja.md": "---\nlang: fr\n---\n# Hello" },
    { languages: ["ja", "en", "fr"] },
  );
  const locations = await content.getContentLocations();
  assert.equal(locations.get("en/README.ja")?.metadata?.["l10n.lang"], "fr");
  const diagnostics = await content.getDiagnostics();
  assert.equal(diagnostics[0]?.code, "L10N_LANGUAGE_CONFLICT");
  assert.equal(diagnostics[0]?.severity, "warning");
  assert.ok(
    (await content.inspect()).diagnostics.some(
      (item) => item.code === "L10N_LANGUAGE_CONFLICT",
    ),
  );
});

test("rejects an invalid language configuration", () => {
  assert.throws(
    () => l10n({ defaultLang: "ja", languages: ["en", "en"] }),
    /defaultLang must be included.*duplicate language tags/s,
  );
});

test("groups arbitrarily named translations by explicit frontmatter identity and supports different slugs", async () => {
  const content = manager({
    "日本語/はじめに.md":
      "---\nlang: ja\ntranslation: getting-started\nslug: hajimete\n---\n# はじめに",
    "English/getting-started.md":
      "---\nlang: en\ntranslation: getting-started\nslug: getting-started\n---\n# Getting started",
  });
  const manifest = await content.getManifest();
  const japanese = manifest.bySlug.get("日本語/はじめに");
  const english = manifest.bySlug.get("English/getting-started");
  assert.equal(japanese?.permalink, "/日本語/はじめに");
  assert.equal(english?.permalink, "/en/English/getting-started");
  assert.deepEqual(
    getLocalization(manifest, japanese?.slug ?? "")?.translations,
    {
      en: "/en/English/getting-started",
      ja: "/日本語/はじめに",
    },
  );
});

test("does not invent missing translations and adds hreflang only for existing variants", async () => {
  const content = manager({
    "guide.ja.md": "---\ntranslation: guide\n---\n# ガイド",
    "guide.en.md": "---\ntranslation: guide\n---\n# Guide",
    "only.ja.md": "---\ntranslation: only\n---\n# 一つだけ",
  });
  const manifest = await content.getManifest();
  const only = manifest.bySlug.get("only.ja");
  assert.deepEqual(getLocalization(manifest, "only.ja")?.availableLanguages, [
    "ja",
  ]);
  assert.equal(only?.headTags?.length, 1);
  assert.deepEqual(only?.headTags?.[0], {
    tag: "link",
    attrs: { rel: "alternate", hreflang: "ja", href: "/only" },
  });
  assert.equal(manifest.byPermalink.has("/en/only"), false);
});

test("publishes the default LanguageSwitcher in a Site-owned article slot", async () => {
  const content = manager({
    "guide.ja.md": "---\ntranslation: guide\n---\n# ガイド",
    "guide.en.md": "---\ntranslation: guide\n---\n# Guide",
  });
  const manifest = await content.getManifest();
  const html =
    manifest.bySlug.get("guide.en")?.bodySlots?.["article.after-meta"];
  assert.match(html ?? "", /class="l10n-switcher"/);
  assert.match(html ?? "", /href="\/guide"/);
  assert.match(html ?? "", /href="\/en\/guide"/);
  assert.ok(
    manifest.assets.some(
      (asset) => asset.moduleSpecifier === "@riebeckite/plugin-l10n/style.css",
    ),
  );
});

test("does not duplicate generated l10n fragments when entries are reused from cache", async () => {
  const buildDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-l10n-cache-"),
  );
  const files = {
    "guide.ja.md": "---\ntranslation: guide\n---\n# ガイド",
    "guide.en.md": "---\ntranslation: guide\n---\n# Guide",
  };

  await manager(files, {}, [], buildDirectory).build({ incremental: true });
  const manifest = await manager(files, {}, [], buildDirectory).build({
    incremental: true,
  });
  const english = manifest.bySlug.get("guide.en");

  assert.equal(
    english?.headTags?.filter(
      (tag) => tag.attrs?.rel === "alternate" && tag.attrs?.hreflang === "en",
    ).length,
    1,
  );
  assert.equal(
    english?.bodySlots?.["article.after-meta"]?.match(/class="l10n-switcher"/g)
      ?.length,
    1,
  );
});

test("allows the switcher to be disabled, moved, or replaced", async () => {
  const files = {
    "guide.ja.md": "---\ntranslation: guide\n---\n# ガイド",
    "guide.en.md": "---\ntranslation: guide\n---\n# Guide",
  };
  const disabled = await manager(files, { ui: false }).getManifest();
  assert.equal(disabled.bySlug.get("guide.en")?.bodySlots, undefined);

  const custom = await manager(files, {
    ui: {
      slot: "article.footer",
      render: ({ localization }: { localization: { lang: string } }) =>
        `<p data-language="${localization.lang}">Translations</p>`,
    },
  }).getManifest();
  assert.equal(
    custom.bySlug.get("guide.en")?.bodySlots?.["article.footer"],
    '<p data-language="en">Translations</p>',
  );
});

test("reports duplicate translation identities without exposing an ambiguous translation", async () => {
  const content = manager({
    "a.en.md": "---\ntranslation: same\n---\n# A",
    "b.en.md": "---\ntranslation: same\n---\n# B",
  });
  const manifest = await content.getManifest();
  assert.ok(
    (await content.getDiagnostics()).some(
      (item) => item.code === "L10N_DUPLICATE_TRANSLATION",
    ),
  );
  assert.deepEqual(getLocalization(manifest, "a.en")?.translations, {});
  assert.equal(getLocalizedContent(manifest, "a.en", "en"), null);
  assert.deepEqual(manifest.bySlug.get("a.en")?.headTags, []);
});

test("strict mode fails location validation for conflicting localization signals", async () => {
  const content = manager(
    { "en/README.ja.md": "---\nlang: ja\n---\n# Hello" },
    { strict: true },
  );
  await assert.rejects(content.getContentLocations(), /L10N_LANGUAGE_CONFLICT/);
});

test("strict mode fails location validation for duplicate translations", async () => {
  const content = manager(
    {
      "a.en.md": "---\ntranslation: same\n---\n# A",
      "b.en.md": "---\ntranslation: same\n---\n# B",
    },
    { strict: true },
  );
  await assert.rejects(
    content.getContentLocations(),
    /L10N_DUPLICATE_TRANSLATION/,
  );
});

test("accepts a custom detector for unsupported conventions", async () => {
  const content = manager(
    { "French/bonjour.md": "# Bonjour" },
    {
      languages: ["ja", "en", "fr"],
      detect: ({ path }) =>
        path.startsWith("French/")
          ? { lang: "fr", translationId: "hello" }
          : undefined,
    },
  );
  const locations = await content.getContentLocations();
  assert.equal(locations.get("French/bonjour")?.metadata?.["l10n.lang"], "fr");
  assert.equal(
    locations.get("French/bonjour")?.metadata?.["l10n.translationId"],
    "hello",
  );
});

test("rewrites Content Graph WikiLink targets to the source language when that translation exists", async () => {
  const content = manager({
    "source.en.md": "---\ntranslation: source\n---\n[[target.en]]",
    "source.ja.md": "---\ntranslation: source\n---\n[[target.en]]",
    "target.en.md": "---\ntranslation: target\n---\n# English",
    "target.ja.md": "---\ntranslation: target\n---\n# Japanese",
  });
  const graph = await content.getContentGraph();
  assert.deepEqual(graph.outgoingSlugs("source.en"), ["target.en"]);
  assert.deepEqual(graph.outgoingSlugs("source.ja"), ["target.ja"]);
});

test("keeps Content Graph links when the target has no current-language translation", async () => {
  const content = manager({
    "source.ja.md": "---\ntranslation: source\n---\n[[target_en]]",
    "target_en.md": "---\ntranslation: target\n---\n# English",
  });

  const graph = await content.getContentGraph();
  assert.deepEqual(graph.outgoingSlugs("source.ja"), ["target_en"]);
});

test("rewrites article links to the current language while preserving query strings and fragments", async () => {
  const content = manager(
    {
      "source.ja.md":
        "---\ntranslation: source\n---\n[Markdown](/en/target?tab=details#section)\n\n[[target_en#Section|WikiLink]]",
      "target.ja.md": "---\ntranslation: target\n---\n# セクション",
      "target_en.md": "---\ntranslation: target\n---\n# Section",
    },
    {},
    [obsidianMarkdown()],
  );

  const source = (await content.getManifest()).bySlug.get("source.ja");
  assert.match(source?.html ?? "", /href="\/target\?tab=details#section"/);
  assert.match(source?.html ?? "", /href="\/target#section"/);
});

test("rewrites WikiLinks and Markdown links after Obsidian resolution", async () => {
  const content = manager(
    {
      "about.md": "---\ntranslation: about\n---\n[Guide](/guide#installation)",
      "about.ja.md":
        "---\ntranslation: about\n---\n[[Guide#Installation]]\n\n[Guide](/guide#installation)",
      "guide.md": "---\ntranslation: guide\n---\n# Guide",
      "guide.ja.md": "---\ntranslation: guide\n---\n# ガイド",
    },
    { defaultLang: "en" },
    [obsidianMarkdown()],
  );

  const source = (await content.getManifest()).bySlug.get("about.ja");
  assert.match(source?.html ?? "", /href="\/ja\/guide#installation"/);
  assert.equal(
    (source?.html.match(/href="\/ja\/guide#installation"/g) ?? []).length,
    2,
  );
  const defaultSource = (await content.getManifest()).bySlug.get("about");
  assert.match(defaultSource?.html ?? "", /href="\/guide#installation"/);
});

test("uses the embedded note as the source of locale-aware link resolution", async () => {
  const content = manager(
    {
      "about.md": "---\ntranslation: about\n---\n# About",
      "about.ja.md": "---\ntranslation: about\n---\n![[embedded_ja]]",
      "embedded.md": "---\ntranslation: embedded\n---\n[[guide]]",
      "embedded_ja.md": "---\ntranslation: embedded\n---\n[[guide]]",
      "guide.md": "---\ntranslation: guide\n---\n# Guide",
      "guide.ja.md": "---\ntranslation: guide\n---\n# ガイド",
    },
    { defaultLang: "en" },
    [obsidianMarkdown()],
  );

  const source = (await content.getManifest()).bySlug.get("about.ja");
  assert.match(source?.html ?? "", /href="\/ja\/guide"/);
});

test("leaves article links unchanged when no translation exists", async () => {
  const content = manager({
    "source.ja.md":
      "---\ntranslation: source\n---\n[English only](/en/only#details)\n\n[External](https://example.com/only)",
    "only.en.md": "---\ntranslation: only\n---\n# English only",
  });

  const source = (await content.getManifest()).bySlug.get("source.ja");
  assert.match(source?.html ?? "", /href="\/en\/only#details"/);
  assert.match(source?.html ?? "", /href="https:\/\/example\.com\/only"/);
});

test("leaves fragment-only, unknown, and asset links unchanged", async () => {
  const content = manager(
    {
      "source.ja.md":
        "---\ntranslation: source\n---\n[Fragment](#installation)\n\n[Unknown](/missing)\n\n[Asset](/manual.pdf)",
    },
    { defaultLang: "en" },
  );

  const source = (await content.getManifest()).bySlug.get("source.ja");
  assert.match(source?.html ?? "", /href="#installation"/);
  assert.match(source?.html ?? "", /href="\/missing"/);
  assert.match(source?.html ?? "", /href="\/manual\.pdf"/);
});
