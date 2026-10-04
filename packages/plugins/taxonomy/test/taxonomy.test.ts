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
    "/tags",
    "/folders",
  ]);

  const tag = await content.resolvePage("/tags/featured");
  assert.equal(tag?.type, "taxonomy-term");
  assert.match(tag?.body ?? "", /data-rr-taxonomy="tag"/);
  assert.equal(tag?.headTags?.[0]?.tag, "link");

  const folder = await content.resolvePage("/folders/guides");
  assert.equal(folder?.type, "taxonomy-term");
  assert.match(folder?.body ?? "", /data-rr-taxonomy="folder"/);

  const tags = await content.resolvePage("/tags");
  assert.equal(tags?.type, "taxonomy-index");
  assert.match(tags?.body ?? "", /data-rr-taxonomy-index="tag"/);
  assert.match(tags?.body ?? "", /href="\/tags\/featured"/);

  const folders = await content.resolvePage("/folders");
  assert.equal(folders?.type, "taxonomy-index");
  assert.match(folders?.body ?? "", /data-rr-taxonomy-index="folder"/);
  assert.match(folders?.body ?? "", /href="\/folders\/guides"/);
});

test("renders taxonomy index pages under custom base paths", async () => {
  const content = new ContentManager(
    source({
      ...taggedNotes,
      "guides/intro.md":
        "---\ntitle: Intro\npublish: true\ntags:\n  - featured\n---\n\n# Intro\n",
    }),
    [],
    {
      config: resolveConfig({
        site: { title: "Test", baseUrl: "https://example.com" },
        plugins: [
          taxonomy({
            tagsBasePath: "/topics",
            foldersBasePath: "/sections",
          }),
        ],
      }),
    },
  );

  assert.deepEqual(await content.getPagePaths(), [
    "/topics/featured",
    "/sections/guides",
    "/topics",
    "/sections",
  ]);

  const tags = await content.resolvePage("/topics");
  assert.equal(tags?.type, "taxonomy-index");
  assert.match(tags?.body ?? "", /data-rr-taxonomy-index="tag"/);
  assert.match(tags?.body ?? "", /href="\/topics\/featured"/);

  const folders = await content.resolvePage("/sections");
  assert.equal(folders?.type, "taxonomy-index");
  assert.match(folders?.body ?? "", /data-rr-taxonomy-index="folder"/);
  assert.match(folders?.body ?? "", /href="\/sections\/guides"/);

  assert.equal(await content.resolvePage("/tags"), null);
  assert.equal(await content.resolvePage("/folders"), null);
});

test("renders the term feed from the manifest entries", async () => {
  const manifest = await manager(config()).getManifest();
  const rss = manifest.generatedOutputs.find(
    (output) => output.path === "tags/featured/feed.xml",
  );
  const atom = manifest.generatedOutputs.find(
    (output) => output.path === "tags/featured/atom.xml",
  );
  const json = manifest.generatedOutputs.find(
    (output) => output.path === "tags/featured/feed.json",
  );

  assert.ok(typeof rss?.content === "string");
  assert.match(rss.content, /<rss /);
  assert.match(rss.content, /https:\/\/example\.com\/alpha/);
  assert.match(rss.content, /<description>Alpha<\/description>/);
  assert.ok(typeof atom?.content === "string");
  assert.match(atom.content, /<feed /);
  assert.match(atom.content, /https:\/\/example\.com\/alpha/);
  assert.match(atom.content, /<summary>Alpha<\/summary>/);
  assert.ok(typeof json?.content === "string");
  const parsedJson = JSON.parse(json.content) as {
    version: string;
    items: Array<{
      url: string;
      summary: string;
      content_text: string;
      content_html?: string;
    }>;
  };
  assert.equal(parsedJson.version, "https://jsonfeed.org/version/1.1");
  assert.equal(parsedJson.items[0]?.url, "https://example.com/alpha");
  assert.equal(parsedJson.items[0]?.summary, "Alpha");
  assert.equal(parsedJson.items[0]?.content_text, "Alpha");
  assert.equal("content_html" in (parsedJson.items[0] ?? {}), false);
});

test("renders folder JSON feeds with summary content and canonical URLs", async () => {
  const content = new ContentManager(
    source({
      "guides/intro.md":
        "---\ntitle: Intro\npublish: true\ndescription: Intro summary\n---\n\n# Intro\n",
    }),
    [],
    { config: config() },
  );
  const manifest = await content.getManifest();
  const json = manifest.generatedOutputs.find(
    (output) => output.path === "folders/guides/feed.json",
  );

  assert.ok(typeof json?.content === "string");
  const parsedJson = JSON.parse(json.content) as {
    feed_url: string;
    items: Array<{
      url: string;
      summary: string;
      content_text: string;
      content_html?: string;
    }>;
  };
  assert.equal(
    parsedJson.feed_url,
    "https://example.com/folders/guides/feed.json",
  );
  assert.equal(parsedJson.items[0]?.url, "https://example.com/guides/intro");
  assert.equal(parsedJson.items[0]?.summary, "Intro summary");
  assert.equal(parsedJson.items[0]?.content_text, "Intro summary");
  assert.equal("content_html" in (parsedJson.items[0] ?? {}), false);
});
