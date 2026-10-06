import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ContentIndexBuilder } from "../src/content/content_index_builder.js";
import { ContentManager } from "../src/content/content_manager.js";
import { extractFrontmatterAliases } from "../src/content/content_metadata.js";
import type { ContentSource } from "../src/content/content_source.js";
import { NoopLogger, SinkTracer } from "../src/observability.js";
import type { ContentManifestEntry } from "../src/types/content_manifest.js";
import { definePlugin } from "../src/types/plugin.js";
import type { PostContent } from "../src/types/post_content.js";
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
    theme: {
      name: "test",
      colorMode: "system",
      typography: "system",
      articleLayout: "article",
      tokens: {},
      attributes: {},
      userCss: [],
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

test("no-change rebuild does not reread content for index aliases", async () => {
  const directory = await tempDirectory("incremental-index-aliases");
  const files = {
    "a.md": "---\naliases: [alpha]\n---\n\n# A",
    "b.md": "---\naliases: [beta]\n---\n\n# B",
  };
  let reads = 0;
  const source: ContentSource = {
    async scan() {
      return Object.keys(files).map((filePath) => ({ path: filePath }));
    },
    async read(entry) {
      reads += 1;
      return files[entry.path as keyof typeof files] ?? "";
    },
  };
  const config = testConfig(directory);
  const buildOnce = async () => {
    const manager = new ContentManager(source, [], {
      config,
      plugins: config.plugins,
      observability: {
        logger: new NoopLogger(),
        tracer: new SinkTracer({ onEvent: () => {}, onSpan: () => {} }),
      },
    });
    const manifest = await manager.build({ incremental: true });
    await manager.dispose();
    return manifest;
  };

  await buildOnce();
  reads = 0;
  const manifest = await buildOnce();

  assert.equal(reads, 2);
  assert.equal(manifest.contentIndex.get("alpha"), "a");
  assert.equal(manifest.contentIndex.get("beta"), "b");
});

test("alias-backed index matches the content-reading index", async () => {
  const files = {
    "folder/a.md": "---\naliases: [alpha]\n---\n\n# A",
    "folder/b.md": "# B",
    "folder/image.png": "image",
  };
  const source = memorySource(files);
  const entries = await source.scan();
  const aliases = new Map(
    entries.map((entry) => [
      entry.path,
      extractFrontmatterAliases(files[entry.path] ?? ""),
    ]),
  );

  const readIndex = await new ContentIndexBuilder(source).build(entries);
  const aliasIndex = ContentIndexBuilder.buildFromAliases(entries, aliases);

  assert.deepEqual(aliasIndex, readIndex);
});

test("frontmatter alias changes rebuild the content index", async () => {
  const directory = await tempDirectory("incremental-index-alias-change");
  const files = {
    "source.md": "# Source\n\n[[old name]]",
    "target.md": "---\naliases: [old name]\n---\n\n# Target",
  };

  await build(files, directory);
  files["target.md"] = "---\naliases: [new name]\n---\n\n# Target";
  const second = await build(files, directory);

  assert.equal(second.processed, 2);
  assert.equal(second.manifest.contentIndex.has("old name"), false);
  assert.equal(second.manifest.contentIndex.get("new name"), "target");
  assert.equal(second.manifest.bySlug.get("source")?.links[0]?.slug, null);
});

test("deleting an alias target reprocesses its link source", async () => {
  const directory = await tempDirectory("incremental-index-alias-delete");
  const files: Record<string, string> = {
    "source.md": "# Source\n\n[[target alias]]",
    "target.md": "---\naliases: [target alias]\n---\n\n# Target",
  };

  await build(files, directory);
  delete files["target.md"];
  const second = await build(files, directory);

  assert.equal(second.processed, 1);
  assert.equal(second.manifest.contentIndex.has("target alias"), false);
  assert.equal(second.manifest.bySlug.get("source")?.links[0]?.slug, null);
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

test("an uncacheable content plugin safely reprocesses every note", async () => {
  const directory = await tempDirectory("incremental-unsafe-plugin");
  const files = {
    "a.md": "# A",
    "b.md": "# B",
  };
  const plugin = definePlugin({
    name: "untracked-content-plugin",
    extendMarkdownPipeline: () => {},
  });
  const buildOnce = async () => {
    const config = { ...testConfig(directory), plugins: [plugin] };
    const spans: { name: string }[] = [];
    const manager = new ContentManager(memorySource(files), [], {
      config,
      plugins: config.plugins,
      observability: {
        logger: new NoopLogger(),
        tracer: new SinkTracer({
          onEvent: () => {},
          onSpan: (span) => spans.push(span),
        }),
      },
    });
    await manager.build({ incremental: true });
    await manager.dispose();
    return spans.filter((span) => span.name === "content.process").length;
  };

  assert.equal(await buildOnce(), 2);
  assert.equal(await buildOnce(), 2);
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
  assert.equal(next.processed, 1);
  assert.equal(next.reused, 2);
  assert.deepEqual([...next.manifest.bySlug.keys()].sort(), ["a", "b", "c"]);

  delete files["b.md"];
  next = await build(files, directory);
  assert.equal(next.processed, 0);
  assert.equal(next.reused, 2);
  assert.deepEqual([...next.manifest.bySlug.keys()].sort(), ["a", "c"]);

  files["moved/a.md"] = files["a.md"];
  delete files["a.md"];
  next = await build(files, directory);
  assert.equal(next.processed, 1);
  assert.equal(next.reused, 1);
  assert.deepEqual([...next.manifest.bySlug.keys()].sort(), ["c", "moved/a"]);
});

test("add independent note does not process existing notes", async () => {
  const directory = await tempDirectory("incremental-add-independent");
  const files = Object.fromEntries(
    Array.from({ length: 120 }, (_, index) => [
      `note-${index}.md`,
      `# Note ${index}`,
    ]),
  );

  await build(files, directory);
  files["new-note.md"] = "# New";
  const second = await build(files, directory);

  assert.equal(second.processed, 1);
  assert.equal(second.reused, 120);
});

test("add resolving wikilink processes previous unresolved link source", async () => {
  const directory = await tempDirectory("incremental-add-wikilink");
  const files = {
    "source.md": "# Source\n\n[[missing-note]]",
    "other.md": "# Other",
  };

  await build(files, directory);
  files["missing-note.md"] = "# Missing";
  const second = await build(files, directory);

  assert.equal(second.processed, 2);
  assert.equal(second.reused, 1);
  assert.equal(
    second.manifest.bySlug.get("source")?.links[0]?.slug,
    "missing-note",
  );
  assert.deepEqual(second.manifest.bySlug.get("missing-note")?.backlinks, [
    "source",
  ]);
});

test("add alias target processes previous unresolved alias reference", async () => {
  const directory = await tempDirectory("incremental-add-alias");
  const files = {
    "source.md": "# Source\n\n[[friendly name]]",
    "other.md": "# Other",
  };

  await build(files, directory);
  files["target.md"] = "---\naliases: [friendly name]\n---\n\n# Target";
  const second = await build(files, directory);

  assert.equal(second.processed, 2);
  assert.equal(second.reused, 1);
  assert.equal(second.manifest.bySlug.get("source")?.links[0]?.slug, "target");
});

test("delete independent note does not process remaining notes", async () => {
  const directory = await tempDirectory("incremental-delete-independent");
  const files = {
    "a.md": "# A",
    "b.md": "# B",
    "c.md": "# C",
  };

  await build(files, directory);
  delete files["c.md"];
  const second = await build(files, directory);

  assert.equal(second.processed, 0);
  assert.equal(second.reused, 2);
  assert.equal(second.manifest.bySlug.has("c"), false);
});

test("delete referenced note processes reference sources", async () => {
  const directory = await tempDirectory("incremental-delete-referenced");
  const files = {
    "source.md": "# Source\n\n[[target]]",
    "target.md": "# Target",
    "other.md": "# Other",
  };

  await build(files, directory);
  delete files["target.md"];
  const second = await build(files, directory);

  assert.equal(second.processed, 1);
  assert.equal(second.reused, 1);
  assert.equal(second.manifest.bySlug.get("source")?.links[0]?.slug, null);
});

test("delete embedded note processes embed sources", async () => {
  const directory = await tempDirectory("incremental-delete-embedded");
  const files = {
    "source.md": "# Source\n\n![[target]]",
    "target.md": "# Target",
    "other.md": "# Other",
  };

  await build(files, directory);
  delete files["target.md"];
  const second = await build(files, directory);

  assert.equal(second.processed, 1);
  assert.equal(second.reused, 1);
  assert.equal(second.manifest.bySlug.get("source")?.links[0]?.slug, null);
});

test("rename referenced note processes old dependents and renamed content", async () => {
  const directory = await tempDirectory("incremental-rename-referenced");
  const files = {
    "source.md": "# Source\n\n[[target]]",
    "target.md": "# Target",
    "other.md": "# Other",
  };

  await build(files, directory);
  files["renamed.md"] = files["target.md"];
  delete files["target.md"];
  const second = await build(files, directory);

  assert.equal(second.processed, 2);
  assert.equal(second.reused, 1);
  assert.equal(second.manifest.bySlug.get("source")?.links[0]?.slug, null);
});

test("structural changes keep backlink and taxonomy derived state fresh", async () => {
  const directory = await tempDirectory("incremental-structural-derived");
  const files = {
    "source.md": "# Source\n\n[[target]] #old",
    "target.md": "# Target",
  };

  await build(files, directory);
  files["added.md"] = "# Added #new";
  let second = await build(files, directory);
  assert.deepEqual(second.manifest.bySlug.get("target")?.backlinks, ["source"]);
  assert.deepEqual(
    second.manifest.byTag.get("new")?.map((entry) => entry.slug),
    ["added"],
  );

  delete files["source.md"];
  second = await build(files, directory);
  assert.deepEqual(second.manifest.bySlug.get("target")?.backlinks, []);
  assert.equal(second.manifest.byTag.has("old"), false);
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

function manifestDecorator(marker: string) {
  return definePlugin({
    name: "manifest-decorator",
    onManifestCreated: ({ manifest }) => {
      for (const entry of manifest.entries) {
        entry.html = `${entry.html}\n<p>${marker}</p>`;
        entry.headTags = [
          ...(entry.headTags ?? []),
          { tag: "meta" as const, attrs: { name: "marker", content: marker } },
        ];
        entry.bodySlots = {
          ...(entry.bodySlots ?? {}),
          footer: `<footer>${marker}</footer>`,
        };
      }
    },
  });
}

function v2ManifestDecorator(marker: string) {
  return definePlugin({
    name: "manifest-decorator",
    onManifestCreated: ({ manifest }) => {
      for (const entry of manifest.entries) {
        entry.html = `${entry.html}\n<p>${marker}</p><hr>`;
        entry.headTags = [
          ...(entry.headTags ?? []),
          { tag: "meta" as const, attrs: { name: "marker", content: marker } },
        ];
        entry.bodySlots = {
          ...(entry.bodySlots ?? {}),
          footer: `<footer>${marker}</footer>`,
        };
      }
    },
  });
}

function lifecycleConfig(
  directory: string,
  marker: string,
  decorator: (
    marker: string,
  ) => ReturnType<typeof definePlugin> = manifestDecorator,
): ResolvedRiebeckiteConfig {
  const config = testConfig(directory);
  return { ...config, plugins: [...config.plugins, decorator(marker)] };
}

async function buildWithDecorator(
  files: Record<string, string>,
  directory: string,
  marker: string,
  decorator?: (marker: string) => ReturnType<typeof definePlugin>,
) {
  const events: { name: string; attributes?: Record<string, unknown> }[] = [];
  const tracer = new SinkTracer({
    onEvent: (event) => events.push(event),
    onSpan: () => {},
  });
  const config = lifecycleConfig(directory, marker, decorator);
  const manager = new ContentManager(memorySource(files), [], {
    config,
    plugins: config.plugins,
    observability: { logger: new NoopLogger(), tracer },
  });
  const manifest = await manager.build({ incremental: true });
  await manager.dispose();
  return {
    manifest,
    reused: events.filter((event) => event.name === "content.reuse").length,
  };
}

function entryView(manifest: { entries: ContentManifestEntry[] }) {
  return manifest.entries.map((entry) => ({
    slug: entry.slug,
    html: entry.html,
    headTags: entry.headTags ?? [],
    bodySlots: entry.bodySlots ?? {},
    links: entry.links,
    backlinks: entry.backlinks,
  }));
}

test("warm rebuild reproduces the cold build when a plugin decorates entries", async () => {
  const directory = await tempDirectory("incremental-decorator");
  const files = { "a.md": "# A", "b.md": "# B" };

  const cold = await buildWithDecorator(files, directory, "first");
  const warm = await buildWithDecorator(files, directory, "first");

  assert.equal(warm.reused, 2);
  assert.deepEqual(entryView(warm.manifest), entryView(cold.manifest));
});

test("repeated warm rebuilds do not duplicate plugin output", async () => {
  const directory = await tempDirectory("incremental-decorator-repeat");
  const files = { "a.md": "# A", "b.md": "# B" };

  await buildWithDecorator(files, directory, "marker");
  await buildWithDecorator(files, directory, "marker");
  const third = await buildWithDecorator(files, directory, "marker");

  for (const entry of third.manifest.entries) {
    assert.equal(
      entry.html?.match(/<p>marker<\/p>/g)?.length ?? 0,
      1,
      `${entry.slug} html`,
    );
    assert.equal(
      entry.headTags?.filter((tag) => tag.attrs.name === "marker").length ?? 0,
      1,
      `${entry.slug} headTags`,
    );
    assert.equal(
      entry.bodySlots?.footer,
      "<footer>marker</footer>",
      `${entry.slug} bodySlots`,
    );
  }
});

test("plugin implementation change invalidates reused manifest entries", async () => {
  const directory = await tempDirectory("incremental-decorator-change");
  const files = { "a.md": "# A" };

  const first = await buildWithDecorator(files, directory, "first");
  const changed = await buildWithDecorator(
    files,
    directory,
    "second",
    v2ManifestDecorator,
  );

  assert.equal(changed.reused, 0);
  for (const entry of changed.manifest.entries) {
    assert.match(entry.html, /<p>second<\/p><hr>/);
    assert.equal(entry.html?.match(/<p>first<\/p>/g)?.length ?? 0, 0);
  }
  assert.notDeepEqual(entryView(changed.manifest), entryView(first.manifest));
});

test("a plugin whose source is unchanged keeps reusing entries", async () => {
  const directory = await tempDirectory("incremental-decorator-stable");
  const files = { "a.md": "# A" };

  await buildWithDecorator(files, directory, "marker", v2ManifestDecorator);
  const second = await buildWithDecorator(
    files,
    directory,
    "marker",
    v2ManifestDecorator,
  );

  assert.equal(second.reused, 1);
  assert.match(second.manifest.entries[0]?.html ?? "", /<hr>/);
});

test("cacheVersion change invalidates reused manifest entries", async () => {
  const directory = await tempDirectory("incremental-decorator-version");
  const files = { "a.md": "# A" };

  await build(files, directory, "v1");
  const versioned = await (async () => {
    const config = lifecycleConfig(directory, "marker");
    const versioned: ResolvedRiebeckiteConfig = {
      ...config,
      plugins: config.plugins.map((plugin) =>
        plugin.name === "incremental-test-plugin"
          ? { ...plugin, cacheVersion: "v2" }
          : plugin,
      ),
    };
    const tracer = new SinkTracer({ onEvent: () => {}, onSpan: () => {} });
    const manager = new ContentManager(memorySource(files), [], {
      config: versioned,
      plugins: versioned.plugins,
      observability: { logger: new NoopLogger(), tracer },
    });
    const manifest = await manager.build({ incremental: true });
    await manager.dispose();
    return manifest;
  })();

  assert.equal(versioned.entries.length, 1);
  assert.match(versioned.entries[0]?.html ?? "", /<p>marker<\/p>/);
});

test("dependency change still invalidates only affected content with a decorating plugin", async () => {
  const directory = await tempDirectory("incremental-decorator-depends");
  const files = {
    "a.md": "# A\n\n[[b]]",
    "b.md": "# B",
    "c.md": "# C",
  };

  await buildWithDecorator(files, directory, "marker");
  files["b.md"] += "\nEdited.";

  const events: { name: string }[] = [];
  const tracer = new SinkTracer({
    onEvent: (event) => events.push(event),
    onSpan: () => {},
  });
  const config = lifecycleConfig(directory, "marker");
  const manager = new ContentManager(memorySource(files), [], {
    config,
    plugins: config.plugins,
    observability: { logger: new NoopLogger(), tracer },
  });
  const manifest = await manager.build({ incremental: true });
  await manager.dispose();

  assert.equal(
    events.filter((event) => event.name === "content.reuse").length,
    1,
  );
  for (const entry of manifest.entries) {
    assert.match(entry.html, /<p>marker<\/p>/);
    assert.equal(entry.html?.match(/<p>marker<\/p>/g)?.length ?? 0, 1);
  }
});

function writebackDecorator(marker: string) {
  const tracked = new Map<string, PostContent>();
  return definePlugin({
    name: "content-writeback",
    processedContentCache: {
      version: "content-writeback-v1",
      dependencyMode: "none",
    },
    onPostProcessed: ({ slug, content }) => {
      tracked.set(slug, content);
    },
    onManifestCreated: ({ manifest }) => {
      for (const entry of manifest.entries) {
        if (!entry.html.includes(marker)) {
          entry.html = `${entry.html}\n<p>${marker}</p>`;
        }
        const content = tracked.get(entry.slug);
        if (content) content.html = entry.html;
      }
      tracked.clear();
    },
  });
}

test("a manifest hook writeback reaches the content route after an incremental edit", async () => {
  const directory = await tempDirectory("incremental-writeback");
  const files = { "a.md": "# A", "b.md": "# B" };
  const buildOnce = async () => {
    const config = testConfig(directory);
    const plugins = [...config.plugins, writebackDecorator("WRITEBACK")];
    const manager = new ContentManager(memorySource(files), [], {
      config: { ...config, plugins },
      plugins,
    });
    const manifest = await manager.build({ incremental: true });
    const processed = await manager.getProcessedContent("b");
    await manager.dispose();
    return { manifest, processed };
  };

  await buildOnce();
  files["b.md"] += "\nEdited.";
  const warm = await buildOnce();

  assert.match(warm.processed.html, /WRITEBACK/);
  assert.equal(warm.processed.html, warm.manifest.bySlug.get("b")?.html);
  for (const entry of warm.manifest.entries) {
    assert.equal(
      entry.html?.match(/WRITEBACK/g)?.length ?? 0,
      1,
      `${entry.slug} html`,
    );
  }
});

function manifestOnlyDecorator(marker: string) {
  return definePlugin({
    name: "manifest-only-decorator",
    processedContentCache: {
      version: "manifest-only-v1",
      dependencyMode: "none",
    },
    onManifestCreated: ({ manifest }) => {
      for (const entry of manifest.entries) {
        if (!entry.html.includes(marker)) {
          entry.html = `${entry.html}\n<p>${marker}</p>`;
        }
      }
    },
  });
}

async function buildWithManifestOnly(
  files: Record<string, string>,
  directory: string,
  marker: string,
) {
  const events: { name: string }[] = [];
  const tracer = new SinkTracer({
    onEvent: (event) => events.push(event),
    onSpan: () => {},
  });
  const config = testConfig(directory);
  const plugins = [...config.plugins, manifestOnlyDecorator(marker)];
  const manager = new ContentManager(memorySource(files), [], {
    config: { ...config, plugins },
    plugins,
    observability: { logger: new NoopLogger(), tracer },
  });
  const manifest = await manager.build({ incremental: true });
  const processed = new Map<string, string>();
  for (const entry of manifest.entries) {
    processed.set(
      entry.slug,
      (await manager.getProcessedContent(entry.slug)).html,
    );
  }
  await manager.dispose();
  return {
    manifest,
    processed,
    reused: events.filter((event) => event.name === "content.reuse").length,
  };
}

function markerCount(value: string, marker: string): number {
  return value.match(new RegExp(`<p>${marker}</p>`, "g"))?.length ?? 0;
}

test("a manifest hook html mutation reaches getProcessedContent without a plugin writeback", async () => {
  const directory = await tempDirectory("manifest-only-basic");
  const files = { "a.md": "# A", "b.md": "# B" };
  const cold = await buildWithManifestOnly(files, directory, "MANIFEST_ONLY");

  for (const entry of cold.manifest.entries) {
    assert.equal(
      markerCount(entry.html, "MANIFEST_ONLY"),
      1,
      `${entry.slug} manifest`,
    );
    const html = cold.processed.get(entry.slug) ?? "";
    assert.equal(html, entry.html, `${entry.slug} processed`);
    assert.equal(
      markerCount(html, "MANIFEST_ONLY"),
      1,
      `${entry.slug} processed`,
    );
  }
});

test("a manifest hook html mutation survives a no-change rebuild exactly once", async () => {
  const directory = await tempDirectory("manifest-only-no-change");
  const files = { "a.md": "# A", "b.md": "# B" };
  const cold = await buildWithManifestOnly(files, directory, "MANIFEST_ONLY");
  const warm = await buildWithManifestOnly(files, directory, "MANIFEST_ONLY");

  assert.equal(warm.reused, 2);
  assert.deepEqual([...warm.processed], [...cold.processed]);
  for (const entry of warm.manifest.entries) {
    assert.equal(
      markerCount(entry.html, "MANIFEST_ONLY"),
      1,
      `${entry.slug} manifest`,
    );
    assert.equal(
      markerCount(warm.processed.get(entry.slug) ?? "", "MANIFEST_ONLY"),
      1,
      `${entry.slug} processed`,
    );
  }
});

test("repeated manifest hook rebuilds do not duplicate output in processed content", async () => {
  const directory = await tempDirectory("manifest-only-repeat");
  const files = { "a.md": "# A", "b.md": "# B" };

  await buildWithManifestOnly(files, directory, "MANIFEST_ONLY");
  await buildWithManifestOnly(files, directory, "MANIFEST_ONLY");
  const third = await buildWithManifestOnly(files, directory, "MANIFEST_ONLY");

  for (const entry of third.manifest.entries) {
    assert.equal(
      markerCount(entry.html, "MANIFEST_ONLY"),
      1,
      `${entry.slug} manifest`,
    );
    assert.equal(
      markerCount(third.processed.get(entry.slug) ?? "", "MANIFEST_ONLY"),
      1,
      `${entry.slug} processed`,
    );
  }
});

test("a manifest hook html mutation is preserved across an incremental edit", async () => {
  const directory = await tempDirectory("manifest-only-edit");
  const files = { "a.md": "# A", "b.md": "# B" };
  await buildWithManifestOnly(files, directory, "MANIFEST_ONLY");

  files["b.md"] += "\nEdited.";
  const warm = await buildWithManifestOnly(files, directory, "MANIFEST_ONLY");

  for (const entry of warm.manifest.entries) {
    assert.equal(
      markerCount(entry.html, "MANIFEST_ONLY"),
      1,
      `${entry.slug} manifest`,
    );
    const html = warm.processed.get(entry.slug) ?? "";
    assert.equal(html, entry.html, `${entry.slug} processed`);
    assert.equal(
      markerCount(html, "MANIFEST_ONLY"),
      1,
      `${entry.slug} processed`,
    );
  }
  assert.match(warm.processed.get("b") ?? "", /Edited/);
});

test("a manifest hook html mutation is not persisted in the content caches", async () => {
  const directory = await tempDirectory("manifest-only-cache");
  const files = { "a.md": "# A", "b.md": "# B" };
  await buildWithManifestOnly(files, directory, "MANIFEST_ONLY");

  const entries = await fs.readdir(directory, { recursive: true });
  for (const relative of entries) {
    const fullPath = path.join(directory, relative);
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) continue;
    const text = await fs.readFile(fullPath, "utf8");
    assert.equal(
      text.includes("MANIFEST_ONLY"),
      false,
      `${relative} must not contain a post-hook mutation`,
    );
  }
});
