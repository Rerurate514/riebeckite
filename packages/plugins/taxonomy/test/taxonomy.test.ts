import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  type ResolvedRiebeckiteConfig,
  resolveConfig,
} from "@riebeckite/core";
import { taxonomy } from "../index.js";

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

const taggedNotes = {
  "alpha.md":
    "---\ntitle: Alpha\npublish: true\ntags:\n  - featured\n---\n\n# Alpha\n",
  "beta.md":
    "---\ntitle: Beta\npublish: true\ntags:\n  - featured\n---\n\n# Beta\n",
};

function manager(config: ResolvedRiebeckiteConfig): ContentManager {
  return new ContentManager(source(taggedNotes), [], { config });
}

function config(): ResolvedRiebeckiteConfig {
  return resolveConfig({
    site: { title: "Test", baseUrl: "https://example.com" },
    plugins: [taxonomy()],
  });
}

test("emits one feed per term and format into the manifest", async () => {
  const manifest = await manager(config()).getManifest();

  assert.deepEqual(
    manifest.generatedOutputs.map((output) => output.path),
    [
      "tags/featured/atom.xml",
      "tags/featured/feed.json",
      "tags/featured/feed.xml",
    ],
  );
});

test("provides tag and folder listings as plugin page types", async () => {
  const content = new ContentManager(
    source({
      ...taggedNotes,
      "guides/intro.md":
        "---\ntitle: Intro\npublish: true\ntags:\n  - featured\n---\n\n# Intro\n",
    }),
    [],
    { config: config() },
  );

  assert.deepEqual(await content.getPagePaths(), [
    "/tags/featured",
    "/folders/guides",
  ]);

  const tag = await content.resolvePage("/tags/featured");
  assert.equal(tag?.type, "taxonomy-term");
  assert.match(tag?.body ?? "", /data-rr-taxonomy="tag"/);
  assert.equal(tag?.headTags?.[0]?.tag, "link");

  const folder = await content.resolvePage("/folders/guides");
  assert.equal(folder?.type, "taxonomy-term");
  assert.match(folder?.body ?? "", /data-rr-taxonomy="folder"/);
});

test("renders the term feed from the manifest entries", async () => {
  const manifest = await manager(config()).getManifest();
  const rss = manifest.generatedOutputs.find(
    (output) => output.path === "tags/featured/feed.xml",
  );
  const json = manifest.generatedOutputs.find(
    (output) => output.path === "tags/featured/feed.json",
  );

  assert.ok(typeof rss?.content === "string");
  assert.match(rss.content, /<rss /);
  assert.match(rss.content, /https:\/\/example\.com\/alpha/);
  assert.ok(typeof json?.content === "string");
  assert.equal(
    (JSON.parse(json.content) as { version: string }).version,
    "https://jsonfeed.org/version/1.1",
  );
});
