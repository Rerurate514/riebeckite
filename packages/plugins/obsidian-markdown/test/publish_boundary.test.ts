import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
  assert.match(html, /\[\[Unresolved embed: private\]\]/);
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

type IncrementalResult = {
  html: string;
  publicSlugs: string[];
  routablePermalinks: string[];
};

async function incrementalBuild(
  source: Record<string, string>,
  directory: string,
): Promise<IncrementalResult> {
  const config = resolveConfig({
    site: { title: "Boundary" },
    plugins: [obsidianMarkdown()],
  });
  config.buildDirectory = directory;
  config.cache = { enabled: true, directory: path.join(directory, "cache") };
  const content = new ContentManager(memorySource(source), [], { config });
  try {
    const manifest = await content.build({ incremental: true });
    return {
      html: manifest.bySlug.get("index")?.html ?? "",
      publicSlugs: manifest.publicEntries.map((entry) => entry.slug).sort(),
      routablePermalinks: [...manifest.byRoutablePermalink.keys()].sort(),
    };
  } finally {
    await content.dispose();
  }
}

async function transitionDirectory(name: string): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), `riebeckite-${name}-`));
}

test("private to public invalidates cached dependents without leaking", async () => {
  const directory = await transitionDirectory("obsidian-private-public");
  const source: Record<string, string> = {
    "index.md": [
      "---",
      "publish: true",
      "---",
      "",
      "[[target]]",
      "![[target]]",
      "",
    ].join("\n"),
    "target.md": ["---", "publish: false", "---", "", PRIVATE_MARKER, ""].join(
      "\n",
    ),
  };

  const first = await incrementalBuild(source, directory);
  assert.doesNotMatch(first.html, new RegExp(PRIVATE_MARKER));
  assert.match(first.html, /class="wikilink wikilink-broken">target<\/a>/);
  assert.doesNotMatch(first.html, /href="\/target"/);

  source["target.md"] = [
    "---",
    "publish: true",
    "---",
    "",
    PRIVATE_MARKER,
    "",
  ].join("\n");
  const second = await incrementalBuild(source, directory);
  const cold = await incrementalBuild(
    source,
    await transitionDirectory("obsidian-cold"),
  );

  assert.equal(second.html, cold.html);
  assert.deepEqual(second.publicSlugs, cold.publicSlugs);
  assert.deepEqual(second.routablePermalinks, cold.routablePermalinks);
  assert.match(second.html, /href="\/target"/);
  assert.ok(second.publicSlugs.includes("target"));
});

test("public to private removes cached embed content from dependents", async () => {
  const directory = await transitionDirectory("obsidian-public-private");
  const source: Record<string, string> = {
    "index.md": [
      "---",
      "publish: true",
      "---",
      "",
      "[[target]]",
      "![[target]]",
      "",
    ].join("\n"),
    "target.md": ["---", "publish: true", "---", "", PRIVATE_MARKER, ""].join(
      "\n",
    ),
  };

  const first = await incrementalBuild(source, directory);
  assert.match(first.html, /href="\/target"/);
  assert.match(first.html, new RegExp(PRIVATE_MARKER));

  source["target.md"] = [
    "---",
    "publish: false",
    "---",
    "",
    PRIVATE_MARKER,
    "",
  ].join("\n");
  const second = await incrementalBuild(source, directory);
  const cold = await incrementalBuild(
    source,
    await transitionDirectory("obsidian-cold"),
  );

  assert.equal(second.html, cold.html);
  assert.deepEqual(second.publicSlugs, cold.publicSlugs);
  assert.deepEqual(second.routablePermalinks, cold.routablePermalinks);
  assert.doesNotMatch(second.html, new RegExp(PRIVATE_MARKER));
  assert.doesNotMatch(second.html, /href="\/target"/);
  assert.match(second.html, /class="wikilink wikilink-broken">target<\/a>/);
});

test("adding a resolving note invalidates cached unresolved wikilinks", async () => {
  const directory = await transitionDirectory("obsidian-unresolved-resolved");
  const source: Record<string, string> = {
    "index.md": [
      "---",
      "publish: true",
      "---",
      "",
      "[[target]]",
      "![[target]]",
      "",
    ].join("\n"),
  };

  const first = await incrementalBuild(source, directory);
  assert.match(first.html, /class="wikilink wikilink-broken">target<\/a>/);
  assert.match(first.html, /\[\[Unresolved embed: target\]\]/);

  source["target.md"] = [
    "---",
    "publish: true",
    "---",
    "",
    PRIVATE_MARKER,
    "",
  ].join("\n");
  const second = await incrementalBuild(source, directory);
  const cold = await incrementalBuild(
    source,
    await transitionDirectory("obsidian-cold"),
  );

  assert.equal(second.html, cold.html);
  assert.deepEqual(second.publicSlugs, cold.publicSlugs);
  assert.deepEqual(second.routablePermalinks, cold.routablePermalinks);
  assert.match(second.html, /href="\/target"/);
  assert.doesNotMatch(second.html, /wikilink-broken/);
});

test("adding a private note keeps cached wikilinks broken without leaking", async () => {
  const directory = await transitionDirectory("obsidian-unresolved-private");
  const source: Record<string, string> = {
    "index.md": [
      "---",
      "publish: true",
      "---",
      "",
      "[[secret]]",
      "![[secret]]",
      "",
    ].join("\n"),
  };

  const first = await incrementalBuild(source, directory);
  assert.match(first.html, /class="wikilink wikilink-broken">secret<\/a>/);

  source["secret.md"] = [
    "---",
    "publish: false",
    "---",
    "",
    PRIVATE_MARKER,
    "",
  ].join("\n");
  const second = await incrementalBuild(source, directory);
  const cold = await incrementalBuild(
    source,
    await transitionDirectory("obsidian-cold"),
  );

  assert.equal(second.html, cold.html);
  assert.deepEqual(second.publicSlugs, cold.publicSlugs);
  assert.deepEqual(second.routablePermalinks, cold.routablePermalinks);
  assert.doesNotMatch(second.html, new RegExp(PRIVATE_MARKER));
  assert.doesNotMatch(second.html, /href="\/secret"/);
  assert.match(second.html, /class="wikilink wikilink-broken">secret<\/a>/);
});
