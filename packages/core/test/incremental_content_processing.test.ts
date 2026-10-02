import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import { NoopLogger, SinkTracer } from "../src/observability.js";
import { definePlugin } from "../src/types/plugin.js";
import type { ResolvedRiebeckiteConfig } from "../src/types/resolved_riebeckite_config.js";

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((filePath) => ({ path: filePath }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

function testConfig(
  directory: string,
  pluginVersion = "v1",
): ResolvedRiebeckiteConfig {
  return {
    buildDirectory: directory,
    site: {
      title: "Test",
      description: "",
      author: "",
      baseUrl: "http://test",
      locale: "en",
      twitterSite: "",
      defaultOgImage: "",
      feed: { title: "", description: "", language: "en" },
    },
    content: {
      directory: "/test",
      exclude: [],
      filters: { publishStrategy: "explicit" },
    },
    markdown: { syntaxHighlight: { theme: "" } },
    theme: {
      name: "test",
      colorMode: "system",
      typography: "system",
      articleLayout: "article",
      tokens: {},
      styles: [],
    },
    plugins: [
      definePlugin({
        name: "incremental-test-plugin",
        cacheVersion: pluginVersion,
        processedContentCache: {
          version: pluginVersion,
          dependencyMode: "tracked",
        },
      }),
    ],
    cache: { enabled: true, directory: path.join(directory, "cache") },
  };
}

async function build(
  files: Record<string, string>,
  directory: string,
  pluginVersion = "v1",
) {
  const events: { name: string; attributes?: Record<string, unknown> }[] = [];
  const spans: { name: string }[] = [];
  const tracer = new SinkTracer({
    onEvent: (event) => events.push(event),
    onSpan: (span) => spans.push(span),
  });
  const config = testConfig(directory, pluginVersion);
  const manager = new ContentManager(memorySource(files), [], {
    config,
    plugins: config.plugins,
    observability: { logger: new NoopLogger(), tracer },
  });
  const manifest = await manager.build({ incremental: true });
  await manager.dispose();
  return {
    manifest,
    processed: spans.filter((span) => span.name === "content.process").length,
    reused: events.filter((event) => event.name === "content.reuse").length,
    affected: Number(
      events.find((event) => event.name === "build.incremental")?.attributes
        ?.affected ?? manifest.entries.length,
    ),
  };
}

async function tempDirectory(name: string): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), `riebeckite-${name}-`));
}

test("no-change rebuild reuses every manifest entry without processing content", async () => {
  const directory = await tempDirectory("incremental-no-change");
  const files = {
    "a.md": "---\ntitle: A\n---\n\n# A",
    "b.md": "---\ntitle: B\n---\n\n# B",
  };

  await build(files, directory);
  const second = await build(files, directory);

  assert.equal(second.affected, 0);
  assert.equal(second.processed, 0);
  assert.equal(second.reused, 2);
});

test("independent edit processes only the changed note", async () => {
  const directory = await tempDirectory("incremental-independent");
  const files = Object.fromEntries(
    Array.from({ length: 20 }, (_, index) => [
      `note-${index}.md`,
      `---\ntitle: Note ${index}\n---\n\n# Note ${index}`,
    ]),
  );

  await build(files, directory);
  files["note-19.md"] += "\nEdited.";
  const second = await build(files, directory);

  assert.equal(second.affected, 1);
  assert.equal(second.processed, 1);
  assert.equal(second.reused, 19);
  assert.match(second.manifest.bySlug.get("note-19")?.html ?? "", /Edited/);
});

test("direct and transitive dependencies are processed when a dependency changes", async () => {
  const directory = await tempDirectory("incremental-dependencies");
  const files = {
    "a.md": "# A\n\n[[b]]",
    "b.md": "# B\n\n[[c]]",
    "c.md": "# C",
  };

  await build(files, directory);
  files["c.md"] += "\nChanged.";
  const second = await build(files, directory);

  assert.equal(second.affected, 3);
  assert.equal(second.processed, 3);
  assert.equal(second.reused, 0);
});

test("embed dependency changes reprocess the embed source", async () => {
  const directory = await tempDirectory("incremental-embed");
  const files = {
    "embedder.md": "# Embedder\n\n![[embedded]]",
    "embedded.md": "# Embedded\n\nOriginal",
    "other.md": "# Other",
  };

  await build(files, directory);
  files["embedded.md"] = "# Embedded\n\nChanged";
  const second = await build(files, directory);

  assert.equal(second.processed, 2);
  assert.equal(second.reused, 1);
  assert.deepEqual(second.manifest.bySlug.get("embedded")?.backlinks, [
    "embedder",
  ]);
});

test("backlinks and taxonomy are rebuilt from reused and processed entries", async () => {
  const directory = await tempDirectory("incremental-derived");
  const files = {
    "a.md": "---\ntags: [old]\n---\n\n# A",
    "b.md": "# B",
  };

  await build(files, directory);
  files["a.md"] = "---\ntags: [new]\n---\n\n# A\n\n[[b]]";
  const second = await build(files, directory);

  assert.equal(second.processed, 1);
  assert.deepEqual(second.manifest.bySlug.get("b")?.backlinks, ["a"]);
  assert.equal(second.manifest.byTag.has("old"), false);
  assert.deepEqual(
    second.manifest.byTag.get("new")?.map((entry) => entry.slug),
    ["a"],
  );
});

test("asset dependency invalidates notes that reference wikilink assets", async () => {
  const directory = await tempDirectory("incremental-asset");
  const files = {
    "a.md": "# A\n\n![[image.png]]",
    "b.md": "# B",
    "image.png": "original",
  };

  await build(files, directory);
  files["image.png"] = "changed";
  const second = await build(files, directory);

  assert.equal(second.affected, 1);
  assert.equal(second.processed, 1);
  assert.equal(second.reused, 1);
});

test("add delete and rename rebuild the complete manifest without stale entries", async () => {
  const directory = await tempDirectory("incremental-structural");
  const files = {
    "a.md": "# A",
    "b.md": "# B",
  };

  await build(files, directory);
  files["c.md"] = "# C";
  let next = await build(files, directory);
  assert.deepEqual([...next.manifest.bySlug.keys()].sort(), ["a", "b", "c"]);

  delete files["b.md"];
  next = await build(files, directory);
  assert.deepEqual([...next.manifest.bySlug.keys()].sort(), ["a", "c"]);

  files["moved/a.md"] = files["a.md"];
  delete files["a.md"];
  next = await build(files, directory);
  assert.deepEqual([...next.manifest.bySlug.keys()].sort(), ["c", "moved/a"]);
});

test("plugin config change does not reuse old processed entries", async () => {
  const directory = await tempDirectory("incremental-plugin-change");
  const files = {
    "a.md": "# A",
    "b.md": "# B",
  };

  await build(files, directory, "v1");
  const second = await build(files, directory, "v2");

  assert.equal(second.affected, 2);
  assert.equal(second.processed, 2);
  assert.equal(second.reused, 0);
});
