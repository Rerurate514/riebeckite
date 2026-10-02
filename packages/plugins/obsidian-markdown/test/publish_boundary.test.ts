import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentManifest,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { obsidianMarkdown } from "../index.js";

const PRIVATE_MARKER = "RIEBECKITE_PRIVATE_CONTENT_MARKER";

const files: Record<string, string> = {
  "public-a.md": [
    "---",
    "publish: true",
    "---",
    "",
    "Links to [[public-b]].",
    "",
  ].join("\n"),
  "public-b.md": ["---", "publish: true", "---", "", "Target B.", ""].join(
    "\n",
  ),
  "public.md": [
    "---",
    "publish: true",
    "---",
    "",
    "[[private]]",
    "[[does-not-exist]]",
    "[[excluded]]",
    "[[Secret Alias]]",
    "[[private#Details]]",
    "![[private]]",
    "[[unspecified]]",
    "",
  ].join("\n"),
  "private.md": [
    "---",
    "publish: false",
    "aliases:",
    "  - Secret Alias",
    "---",
    "",
    "## Details",
    "",
    PRIVATE_MARKER,
    "",
  ].join("\n"),
  "excluded.md": ["---", "publish: true", "---", "", "Excluded body.", ""].join(
    "\n",
  ),
  "unspecified.md": ["Unspecified body.", ""].join("\n"),
};

const exclude = ["excluded.md"];

let manifestPromise: Promise<ContentManifest> | null = null;

function buildManifest(): Promise<ContentManifest> {
  manifestPromise ??= (async () => {
    const config = resolveConfig({
      site: { title: "Boundary" },
      content: { exclude },
      plugins: [obsidianMarkdown()],
    });
    const content = new ContentManager(memorySource(files, exclude), exclude, {
      config,
    });
    try {
      return await content.build();
    } finally {
      await content.dispose();
    }
  })();
  return manifestPromise;
}

async function publicHtml(): Promise<string> {
  const manifest = await buildManifest();
  const entry = manifest.bySlug.get("public");
  assert.ok(entry);
  return entry.html;
}

test("public to public link points at an existing route", async () => {
  const manifest = await buildManifest();
  const entry = manifest.bySlug.get("public-a");
  assert.ok(entry);
  assert.match(
    entry.html,
    /<a href="\/public-b" class="wikilink">public-b<\/a>/,
  );
  assert.ok(manifest.byRoutablePermalink.has("/public-b"));
});

test("public to private renders as a broken wikilink", async () => {
  const html = await publicHtml();
  assert.match(html, /class="wikilink wikilink-broken">private<\/a>/);
  assert.doesNotMatch(html, /href="\/private"/);
});

test("public to missing renders as a broken wikilink", async () => {
  const html = await publicHtml();
  assert.match(html, /class="wikilink wikilink-broken">does-not-exist<\/a>/);
});

test("public to excluded renders as a broken wikilink", async () => {
  const html = await publicHtml();
  assert.match(html, /class="wikilink wikilink-broken">excluded<\/a>/);
  const manifest = await buildManifest();
  assert.equal(manifest.bySlug.has("excluded"), false);
});

test("public to publish-unspecified renders as a broken wikilink", async () => {
  const html = await publicHtml();
  assert.match(html, /class="wikilink wikilink-broken">unspecified<\/a>/);
  assert.doesNotMatch(html, /href="\/unspecified"/);
  const manifest = await buildManifest();
  assert.equal(
    manifest.publicEntries.some((entry) => entry.slug === "unspecified"),
    false,
  );
});

test("private alias respects the publication boundary", async () => {
  const html = await publicHtml();
  assert.match(html, /class="wikilink wikilink-broken">Secret Alias<\/a>/);
  assert.doesNotMatch(html, /href="\/private"/);
});

test("private heading respects the publication boundary", async () => {
  const html = await publicHtml();
  assert.match(html, /class="wikilink wikilink-broken">private<\/a>/);
  assert.doesNotMatch(html, /\/private#details/);
  assert.doesNotMatch(html, /href="\/private"/);
});

test("private embed does not inline the private body", async () => {
  const html = await publicHtml();
  assert.doesNotMatch(html, new RegExp(PRIVATE_MARKER));
  assert.doesNotMatch(html, /wikilink-embed/);
  assert.match(html, /\[\[埋め込み未解決：private\]\]/);
});

test("private marker never reaches published output", async () => {
  const manifest = await buildManifest();
  for (const entry of manifest.publicEntries) {
    assert.doesNotMatch(entry.html, new RegExp(PRIVATE_MARKER));
  }
  assert.equal(
    manifest.publicEntries.some((entry) => entry.slug === "private"),
    false,
  );
  assert.deepEqual([...manifest.byRoutablePermalink.keys()].sort(), [
    "/public",
    "/public-a",
    "/public-b",
  ]);
});

function memorySource(
  source: Record<string, string>,
  exclude: string[] = [],
): ContentSource {
  return {
    async scan() {
      return Object.keys(source)
        .filter((path) => !exclude.includes(path))
        .map((path) => ({ path }));
    },
    async read(entry) {
      return source[entry.path] ?? "";
    },
  };
}
