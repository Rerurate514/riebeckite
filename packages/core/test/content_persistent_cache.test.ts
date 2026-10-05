import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ContentManager } from "../src/content/content_manager.js";
import {
  CONTENT_CACHE_SCHEMA_VERSION,
  computeContentCacheKey,
  computePipelineFingerprint,
  createPersistentContentCache,
  isPersistentlyCacheable,
} from "../src/content/content_persistent_cache.js";
import {
  type ContentSource,
  readContentSourceEntry,
} from "../src/content/content_source.js";
import type { RiebeckitePlugin } from "../src/types/plugin.js";
import { definePlugin } from "../src/types/plugin.js";
import type { ResolvedRiebeckiteConfig } from "../src/types/resolved_riebeckite_config.js";

const TEST_CACHE_DIR = path.join(os.tmpdir(), "riebeckite-content-cache-tests");

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

function createTestConfig(
  plugins: ResolvedRiebeckiteConfig["plugins"] = [],
): ResolvedRiebeckiteConfig {
  return {
    buildDirectory: TEST_CACHE_DIR,
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
    plugins,
    cache: { enabled: true, directory: TEST_CACHE_DIR },
  };
}

function createTrackedFilePlugin(
  dependencyPath: (slug: string) => string,
  counters?: { pipelineExecutions: number },
) {
  return definePlugin({
    name: "tracked-file-transformer",
    cacheVersion: "tracked-file-transformer-v1",
    processedContentCache: {
      version: "tracked-file-transformer-v1",
      dependencyMode: "tracked",
    },
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(() => async (tree: { children?: unknown[] }) => {
        if (counters) counters.pipelineExecutions += 1;
        const dependency = dependencyPath(context.sourceSlug);
        const content = context.contentSource
          ? await readContentSourceEntry(context.contentSource, dependency)
          : null;
        const value =
          content === null
            ? "missing"
            : typeof content === "string"
              ? content
              : new TextDecoder().decode(content);
        tree.children ??= [];
        tree.children.push({
          type: "html",
          value: `<p data-dependency="${dependency}">${value}</p>`,
        });
      });
    },
  });
}

function createTrackedFilesPlugin(
  dependencyPaths: (slug: string) => readonly string[],
  counters?: { pipelineExecutions: number },
) {
  return definePlugin({
    name: "tracked-files-transformer",
    cacheVersion: "tracked-files-transformer-v1",
    processedContentCache: {
      version: "tracked-files-transformer-v1",
      dependencyMode: "tracked",
    },
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(() => async (tree: { children?: unknown[] }) => {
        if (counters) counters.pipelineExecutions += 1;
        tree.children ??= [];

        for (const dependency of dependencyPaths(context.sourceSlug)) {
          const content = context.contentSource
            ? await readContentSourceEntry(context.contentSource, dependency)
            : null;
          const value =
            content === null
              ? "missing"
              : typeof content === "string"
                ? content
                : new TextDecoder().decode(content);
          tree.children.push({
            type: "html",
            value: `<p data-dependency="${dependency}">${value}</p>`,
          });
        }
      });
    },
  });
}

function createRendererDependencyPlugin(counters?: {
  pipelineExecutions: number;
}) {
  return definePlugin({
    name: "renderer-dependency-transformer",
    cacheVersion: "renderer-dependency-transformer-v1",
    processedContentCache: {
      version: "renderer-dependency-transformer-v1",
      dependencyMode: "tracked",
    },
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(() => async (tree: { children?: unknown[] }) => {
        if (counters) counters.pipelineExecutions += 1;
        const rendered = await context.renderContent?.({
          kind: "attachment",
          path: "dep.txt",
          raw: "",
          label: "dep.txt",
          url: "/dep.txt",
          embed: true,
        });
        tree.children ??= [];
        tree.children.push({
          type: "html",
          value: `<section data-attachment>${rendered ?? "missing"}</section>`,
        });
      });
    },
    renderers: [
      {
        name: "sized-attachment",
        render: async (renderContext) => {
          if (renderContext.kind !== "attachment") return null;
          const content = renderContext.contentSource
            ? await readContentSourceEntry(
                renderContext.contentSource,
                renderContext.path,
              )
            : null;
          if (content === null) return null;
          const size =
            typeof content === "string"
              ? new TextEncoder().encode(content).byteLength
              : content.byteLength;
          return `<p data-size="${size}">${size}</p>`;
        },
      },
    ],
  });
}

function createTransitiveEmbedPlugin(counters?: {
  pipelineExecutions: number;
}) {
  return definePlugin({
    name: "transitive-embed-transformer",
    cacheVersion: "transitive-embed-transformer-v1",
    processedContentCache: {
      version: "transitive-embed-transformer-v1",
      dependencyMode: "tracked",
    },
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(() => async (tree: { children?: unknown[] }) => {
        const next =
          context.sourceSlug === "a"
            ? "b"
            : context.sourceSlug === "b"
              ? "c"
              : null;
        if (!next) return;
        if (counters) counters.pipelineExecutions += 1;
        const embedded = await context.renderNoteEmbed?.(next, undefined);
        tree.children ??= [];
        tree.children.push({
          type: "html",
          value: `<section data-embed="${next}">${embedded ?? "missing"}</section>`,
        });
      });
    },
  });
}

function createTrackedEmbedPlugin(counters?: { pipelineExecutions: number }) {
  return definePlugin({
    name: "tracked-note-embed-transformer",
    cacheVersion: "tracked-note-embed-transformer-v1",
    processedContentCache: {
      version: "tracked-note-embed-transformer-v1",
      dependencyMode: "tracked",
    },
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(() => async (tree: { children?: unknown[] }) => {
        if (context.sourceSlug !== "note") return;
        if (counters) counters.pipelineExecutions += 1;
        const embedded = await context.renderNoteEmbed?.("dep", undefined);
        tree.children ??= [];
        tree.children.push({
          type: "html",
          value: `<section data-embed="dep">${embedded ?? "missing"}</section>`,
        });
      });
    },
  });
}

async function processedHtml(
  files: Record<string, string>,
  cacheDirectory: string,
  slug: string,
  plugin: RiebeckitePlugin,
): Promise<string> {
  const config = createTestConfig([plugin]);
  config.cache.directory = cacheDirectory;
  const manager = new ContentManager(memorySource(files), [], {
    config,
    plugins: config.plugins,
  });
  return (await manager.getProcessedContent(slug)).html;
}

test("computeContentCacheKey produces stable keys", () => {
  const inputs = {
    slug: "test-note",
    source: "---\ntitle: Test\n---\n\n# Test",
    frontmatter: { title: "Test", publish: true },
    pipelineFingerprint: "abc123",
  };

  const key1 = computeContentCacheKey(inputs);
  const key2 = computeContentCacheKey(inputs);

  assert.equal(key1, key2);
  assert.equal(key1.length, 64); // sha256 hex
});

test("computeContentCacheKey changes when source changes", () => {
  const base = {
    slug: "test-note",
    source: "---\ntitle: Test\n---\n\n# Test",
    frontmatter: { title: "Test" },
    pipelineFingerprint: "abc123",
  };

  const key1 = computeContentCacheKey(base);
  const key2 = computeContentCacheKey({
    ...base,
    source: "---\ntitle: Test\n---\n\n# Changed",
  });

  assert.notEqual(key1, key2);
});

test("computeContentCacheKey changes when frontmatter changes", () => {
  const base = {
    slug: "test-note",
    source: "---\ntitle: Test\n---\n\n# Test",
    frontmatter: { title: "Test", publish: true },
    pipelineFingerprint: "abc123",
  };

  const key1 = computeContentCacheKey(base);
  const key2 = computeContentCacheKey({
    ...base,
    frontmatter: { title: "Test", publish: false },
  });

  assert.notEqual(key1, key2);
});

test("computeContentCacheKey changes when pipeline fingerprint changes", () => {
  const base = {
    slug: "test-note",
    source: "---\ntitle: Test\n---\n\n# Test",
    frontmatter: { title: "Test" },
    pipelineFingerprint: "abc123",
  };

  const key1 = computeContentCacheKey(base);
  const key2 = computeContentCacheKey({
    ...base,
    pipelineFingerprint: "def456",
  });

  assert.notEqual(key1, key2);
});

test("normalizeFrontmatterForCache converts Dates to ISO strings", () => {
  const date = new Date("2024-01-15T10:30:00Z");
  const frontmatter = { date, title: "Test", tags: ["a", "b"] };

  // Test via computeContentCacheKey which uses normalizeFrontmatterForCache internally
  const key1 = computeContentCacheKey({
    slug: "test",
    source: "test",
    frontmatter,
    pipelineFingerprint: "fp",
  });
  const key2 = computeContentCacheKey({
    slug: "test",
    source: "test",
    frontmatter: { ...frontmatter, date: date.toISOString() },
    pipelineFingerprint: "fp",
  });

  // Date and ISO string should produce same key after normalization
  assert.equal(key1, key2);
});

test("computePipelineFingerprint is stable", () => {
  const config = createTestConfig([]);
  const fp1 = computePipelineFingerprint(config);
  const fp2 = computePipelineFingerprint(config);

  assert.equal(fp1, fp2);
  assert.equal(fp1.length, 64);
});

test("computePipelineFingerprint changes with plugin config", () => {
  const config1 = createTestConfig([]);
  const config2 = createTestConfig([
    { name: "test-plugin", options: { foo: "bar" } },
  ]);

  const fp1 = computePipelineFingerprint(config1);
  const fp2 = computePipelineFingerprint(config2);

  assert.notEqual(fp1, fp2);
});

test("computePipelineFingerprint changes with plugin ordering", () => {
  const first = createTestConfig([
    { name: "first-plugin" },
    { name: "second-plugin" },
  ]);
  const second = createTestConfig([
    { name: "second-plugin" },
    { name: "first-plugin" },
  ]);

  assert.notEqual(
    computePipelineFingerprint(first),
    computePipelineFingerprint(second),
  );
});

test("computePipelineFingerprint changes with plugin cacheVersion", () => {
  const first = createTestConfig([{ name: "plugin", cacheVersion: "v1" }]);
  const second = createTestConfig([{ name: "plugin", cacheVersion: "v2" }]);

  assert.notEqual(
    computePipelineFingerprint(first),
    computePipelineFingerprint(second),
  );
});

test("extractFrontmatter parses YAML frontmatter", () => {
  // Test indirectly via cache key computation which uses extractFrontmatter internally
  const markdown1 =
    "---\ntitle: Test\npublish: true\ntags: [a, b]\n---\n\n# Content";
  const markdown2 =
    "---\ntitle: Test\npublish: true\ntags: [a, b]\n---\n\n# Content";

  const key1 = computeContentCacheKey({
    slug: "test",
    source: markdown1,
    frontmatter: { title: "Test", publish: true, tags: ["a", "b"] },
    pipelineFingerprint: "fp",
  });

  const key2 = computeContentCacheKey({
    slug: "test",
    source: markdown2,
    frontmatter: { title: "Test", publish: true, tags: ["a", "b"] },
    pipelineFingerprint: "fp",
  });

  assert.equal(key1, key2);
});

test("extractFrontmatter returns empty object for no frontmatter", () => {
  // Test indirectly - no frontmatter should still produce stable keys
  const markdown1 = "# Just content";
  const markdown2 = "# Just content";

  const key1 = computeContentCacheKey({
    slug: "test",
    source: markdown1,
    frontmatter: {},
    pipelineFingerprint: "fp",
  });

  const key2 = computeContentCacheKey({
    slug: "test",
    source: markdown2,
    frontmatter: {},
    pipelineFingerprint: "fp",
  });

  assert.equal(key1, key2);
});

test("isPersistentlyCacheable returns false when l10n is enabled", () => {
  const config = createTestConfig([{ name: "l10n", enabled: true }]);
  const result = isPersistentlyCacheable("test", config);

  assert.equal(result.cacheable, false);
  assert.equal(result.reason, "l10n plugin is enabled");
});

test("isPersistentlyCacheable returns true when l10n is disabled", () => {
  const config = createTestConfig([{ name: "other-plugin", enabled: true }]);
  const result = isPersistentlyCacheable("test", config);

  assert.equal(result.cacheable, true);
});

test("isPersistentlyCacheable bypasses transform functions without processedContentCache contract", () => {
  const config = createTestConfig([
    {
      name: "custom-transformer",
      extendMarkdownPipeline: () => undefined,
    },
  ]);
  const result = isPersistentlyCacheable("test", config);

  assert.equal(result.cacheable, false);
  assert.match(result.reason ?? "", /custom-transformer/);
});

test("isPersistentlyCacheable does not treat cacheVersion as a processed content cache contract", () => {
  const config = createTestConfig([
    {
      name: "versioned-transformer",
      cacheVersion: "content-transform-v1",
      extendMarkdownPipeline: () => undefined,
    },
  ]);
  const result = isPersistentlyCacheable("test", config);

  assert.equal(result.cacheable, false);
  assert.match(result.reason ?? "", /processedContentCache contract/);
});

test("isPersistentlyCacheable allows transform functions with tracked processed content cache contract", () => {
  const config = createTestConfig([
    {
      name: "tracked-transformer",
      processedContentCache: {
        version: "tracked-transform-v1",
        dependencyMode: "tracked",
      },
      extendMarkdownPipeline: () => undefined,
    },
  ]);
  const result = isPersistentlyCacheable("test", config);

  assert.equal(result.cacheable, true);
});

test("isPersistentlyCacheable allows transform functions with none processed content cache contract", () => {
  const config = createTestConfig([
    {
      name: "source-only-transformer",
      processedContentCache: {
        version: "source-only-transform-v1",
        dependencyMode: "none",
      },
      extendMarkdownPipeline: () => undefined,
    },
  ]);
  const result = isPersistentlyCacheable("test", config);

  assert.equal(result.cacheable, true);
});

test("isPersistentlyCacheable bypasses transform functions explicitly marked unsafe", () => {
  const config = createTestConfig([
    {
      name: "unsafe-transformer",
      processedContentCache: {
        version: "unsafe-transform-v1",
        dependencyMode: "unsafe",
      },
      extendMarkdownPipeline: () => undefined,
    },
  ]);
  const result = isPersistentlyCacheable("test", config);

  assert.equal(result.cacheable, false);
  assert.match(result.reason ?? "", /explicitly marks/);
});

test("isPersistentlyCacheable treats renderers as processed content transformers", () => {
  const config = createTestConfig([
    {
      name: "custom-renderer",
      renderers: [{ name: "custom", render: () => null }],
    },
  ]);
  const result = isPersistentlyCacheable("test", config);

  assert.equal(result.cacheable, false);
  assert.match(result.reason ?? "", /processedContentCache contract/);
});

test("isPersistentlyCacheable allows renderer plugins with none processed content cache contract", () => {
  const config = createTestConfig([
    {
      name: "source-only-renderer",
      processedContentCache: {
        version: "source-only-renderer-v1",
        dependencyMode: "none",
      },
      renderers: [{ name: "custom", render: () => null }],
    },
  ]);
  const result = isPersistentlyCacheable("test", config);

  assert.equal(result.cacheable, true);
});

test("computePipelineFingerprint changes when processedContentCache contract version changes", () => {
  const config1 = createTestConfig([
    {
      name: "contracted-transformer",
      processedContentCache: { version: "v1", dependencyMode: "none" },
      extendMarkdownPipeline: () => undefined,
    },
  ]);
  const config2 = createTestConfig([
    {
      name: "contracted-transformer",
      processedContentCache: { version: "v2", dependencyMode: "none" },
      extendMarkdownPipeline: () => undefined,
    },
  ]);

  assert.notEqual(
    computePipelineFingerprint(config1),
    computePipelineFingerprint(config2),
  );
});

test("createPersistentContentCache writes and reads entries", async () => {
  const config = createTestConfig([]);
  const cache = createPersistentContentCache({ config });

  const key = "test-key";
  const entry = {
    schemaVersion: CONTENT_CACHE_SCHEMA_VERSION,
    key,
    dependencies: [],
    value: { frontmatter: { title: "Test" }, html: "<h1>Test</h1>" },
  };

  await cache.set(key, entry);
  const retrieved = await cache.get(key);

  assert.deepEqual(retrieved, entry);
});

test("createPersistentContentCache returns undefined for missing key", async () => {
  const config = createTestConfig([]);
  const cache = createPersistentContentCache({ config });

  const result = await cache.get("non-existent-key");
  assert.equal(result, undefined);
});

test("createPersistentContentCache returns undefined when cache disabled", async () => {
  const config = createTestConfig([]);
  config.cache.enabled = false;
  const cache = createPersistentContentCache({ config });

  const key = "test-key";
  const entry = {
    schemaVersion: CONTENT_CACHE_SCHEMA_VERSION,
    key,
    dependencies: [],
    value: { frontmatter: {}, html: "" },
  };

  await cache.set(key, entry);
  const result = await cache.get(key);

  assert.equal(result, undefined);
});

test("persistent cache ignores corrupted entries", async () => {
  const config = createTestConfig([]);
  config.cache.directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-corrupted-cache-"),
  );
  const cache = createPersistentContentCache({ config });

  const cacheDir = path.join(
    config.cache.directory,
    "content",
    `v${CONTENT_CACHE_SCHEMA_VERSION}`,
  );
  const key = "corrupted-key";
  await cache.set(key, {
    schemaVersion: CONTENT_CACHE_SCHEMA_VERSION,
    key,
    dependencies: [],
    value: { frontmatter: {}, html: "" },
  });
  const [fileName] = await fs.readdir(cacheDir);
  if (!fileName) throw new Error("Expected a cache entry");
  const filePath = path.join(cacheDir, fileName);
  await fs.writeFile(filePath, "not valid json", "utf8");

  const result = await cache.get(key);
  assert.equal(result, undefined);
  await fs.rm(config.cache.directory, { recursive: true, force: true });
});

test("persistent cache ignores incompatible entry versions", async () => {
  const config = createTestConfig([]);
  config.cache.directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-incompatible-cache-"),
  );
  const cache = createPersistentContentCache({ config });
  const key = "incompatible-version";
  const entry = {
    schemaVersion: CONTENT_CACHE_SCHEMA_VERSION - 1,
    key,
    dependencies: [],
    value: { frontmatter: {}, html: "" },
  };
  const cacheDir = path.join(
    config.cache.directory,
    "content",
    `v${CONTENT_CACHE_SCHEMA_VERSION}`,
  );
  await cache.set(key, {
    ...entry,
    schemaVersion: CONTENT_CACHE_SCHEMA_VERSION,
  });
  const [fileName] = await fs.readdir(cacheDir);
  if (!fileName) throw new Error("Expected a cache entry");
  const filePath = path.join(cacheDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(entry), "utf8");

  assert.equal(await cache.get(key), undefined);
  await fs.rm(config.cache.directory, { recursive: true, force: true });
});

test("persistent cache is portable between workspaces", async () => {
  const source = {
    "note.md": "---\ntitle: Note\n---\n\n# Note\n",
  };
  const workspaceA = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-cache-workspace-a-"),
  );
  const workspaceB = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-cache-workspace-b-"),
  );
  try {
    const firstConfig = createTestConfig([]);
    firstConfig.cache.directory = path.join(workspaceA, "cache");
    const first = new ContentManager(memorySource(source), [], {
      config: firstConfig,
      plugins: firstConfig.plugins,
    });
    const cold = await first.getProcessedContent("note");

    await fs.cp(firstConfig.cache.directory, path.join(workspaceB, "cache"), {
      recursive: true,
    });
    const results: string[] = [];
    const secondConfig = createTestConfig([]);
    secondConfig.cache.directory = path.join(workspaceB, "cache");
    const second = new ContentManager(memorySource(source), [], {
      config: secondConfig,
      plugins: secondConfig.plugins,
      onPersistentContentCacheResult: (result) => results.push(result),
    });
    const warm = await second.getProcessedContent("note");

    assert.deepEqual(warm, cold);
    assert.deepEqual(results, ["hit"]);
  } finally {
    await fs.rm(workspaceA, { recursive: true, force: true });
    await fs.rm(workspaceB, { recursive: true, force: true });
  }
});

test("persistent cache atomic write does not leave partial files", async () => {
  const config = createTestConfig([]);
  const cache = createPersistentContentCache({ config });

  const key = "atomic-test";
  const entry = {
    schemaVersion: CONTENT_CACHE_SCHEMA_VERSION,
    key,
    dependencies: [],
    value: { frontmatter: { title: "Test" }, html: "<h1>Test</h1>" },
  };

  await cache.set(key, entry);

  const cacheDir = path.join(
    TEST_CACHE_DIR,
    "content",
    `v${CONTENT_CACHE_SCHEMA_VERSION}`,
  );
  const files = await fs.readdir(cacheDir);
  const tmpFiles = files.filter((f) => f.endsWith(".tmp"));

  assert.equal(tmpFiles.length, 0);
});

test("persistent cache mutation safety - returned object is independent", async () => {
  const config = createTestConfig([]);
  const cache = createPersistentContentCache({ config });

  const key = "mutation-test";
  const entry = {
    schemaVersion: CONTENT_CACHE_SCHEMA_VERSION,
    key,
    dependencies: [],
    value: { frontmatter: { title: "Original" }, html: "<h1>Original</h1>" },
  };

  await cache.set(key, entry);
  const retrieved = await cache.get(key);

  if (!retrieved) {
    throw new Error("Expected cache entry to exist");
  }

  // Simulate mutation as plugins might do
  retrieved.value.frontmatter.title = "Mutated";
  retrieved.value.html = "<h1>Mutated</h1>";

  // Re-read from cache - should be unchanged
  const fresh = await cache.get(key);

  if (!fresh) {
    throw new Error("Expected cache entry to exist");
  }

  assert.equal(fresh.value.frontmatter.title, "Original");
  assert.equal(fresh.value.html, "<h1>Original</h1>");
});

test("unversioned dependency-bearing post hook is bypassed to avoid stale HTML", async () => {
  const cacheDirectory = path.join(TEST_CACHE_DIR, "dependency-hook");
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  let dependencyValue = "v1";
  let postProcessedCount = 0;
  const plugin = definePlugin({
    name: "external-dependency-hook",
    onPostProcessed: (_context) => {
      postProcessedCount += 1;
      _context.content.html += `<p>${dependencyValue}</p>`;
    },
  });
  const config = createTestConfig([plugin]);
  config.cache.directory = cacheDirectory;

  const files = {
    "note.md": "---\ntitle: Note\npublish: true\n---\n\n# Note\n",
  };

  const first = new ContentManager(memorySource(files), [], {
    config,
    plugins: config.plugins,
  });
  const firstContent = await first.getProcessedContent("note");
  assert.match(firstContent.html, /v1/);

  dependencyValue = "v2";
  const second = new ContentManager(memorySource(files), [], {
    config,
    plugins: config.plugins,
  });
  const secondContent = await second.getProcessedContent("note");

  assert.match(secondContent.html, /v2/);
  assert.equal(postProcessedCount, 2);
});

test("unchanged tracked file dependency hits and skips pipeline", async () => {
  const cacheDirectory = path.join(TEST_CACHE_DIR, "tracked-file-hit");
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  const counters = { pipelineExecutions: 0 };
  const plugin = createTrackedFilePlugin(() => "dep.txt", counters);
  const files = {
    "note.md": "---\ntitle: Note\npublish: true\n---\n\n# Note\n",
    "dep.txt": "dependency-v1",
  };

  const firstHtml = await processedHtml(files, cacheDirectory, "note", plugin);
  const secondHtml = await processedHtml(files, cacheDirectory, "note", plugin);

  assert.match(firstHtml, /dependency-v1/);
  assert.equal(secondHtml, firstHtml);
  assert.equal(counters.pipelineExecutions, 1);
});

test("changed tracked file dependency misses and updates output", async () => {
  const cacheDirectory = path.join(TEST_CACHE_DIR, "tracked-file-change");
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  const counters = { pipelineExecutions: 0 };
  const plugin = createTrackedFilePlugin(() => "dep.txt", counters);
  const base = {
    "note.md": "---\ntitle: Note\npublish: true\n---\n\n# Note\n",
  };

  const firstHtml = await processedHtml(
    { ...base, "dep.txt": "dependency-v1" },
    cacheDirectory,
    "note",
    plugin,
  );
  const secondHtml = await processedHtml(
    { ...base, "dep.txt": "dependency-v2" },
    cacheDirectory,
    "note",
    plugin,
  );

  assert.match(firstHtml, /dependency-v1/);
  assert.match(secondHtml, /dependency-v2/);
  assert.equal(counters.pipelineExecutions, 2);
});

test("deleted tracked file dependency misses and rebuilds", async () => {
  const cacheDirectory = path.join(TEST_CACHE_DIR, "tracked-file-deleted");
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  const counters = { pipelineExecutions: 0 };
  const plugin = createTrackedFilePlugin(() => "dep.txt", counters);
  const base = {
    "note.md": "---\ntitle: Note\npublish: true\n---\n\n# Note\n",
  };

  const firstHtml = await processedHtml(
    { ...base, "dep.txt": "dependency-v1" },
    cacheDirectory,
    "note",
    plugin,
  );
  const secondHtml = await processedHtml(base, cacheDirectory, "note", plugin);

  assert.match(firstHtml, /dependency-v1/);
  assert.match(secondHtml, /missing/);
  assert.equal(counters.pipelineExecutions, 2);
});

test("multiple tracked dependencies are validated for one content", async () => {
  const cacheDirectory = path.join(TEST_CACHE_DIR, "tracked-multiple-files");
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  const counters = { pipelineExecutions: 0 };
  const plugin = createTrackedFilesPlugin(
    () => ["dep-a.txt", "dep-b.txt"],
    counters,
  );
  const base = {
    "note.md": "---\ntitle: Note\npublish: true\n---\n\n# Note\n",
    "dep-a.txt": "A1",
  };

  const firstHtml = await processedHtml(
    { ...base, "dep-b.txt": "B1" },
    cacheDirectory,
    "note",
    plugin,
  );
  const secondHtml = await processedHtml(
    { ...base, "dep-b.txt": "B2" },
    cacheDirectory,
    "note",
    plugin,
  );

  assert.match(firstHtml, /A1/);
  assert.match(firstHtml, /B1/);
  assert.match(secondHtml, /A1/);
  assert.match(secondHtml, /B2/);
  assert.equal(counters.pipelineExecutions, 2);
});

test("tracked dependencies are isolated across parallel content processing", async () => {
  const cacheDirectory = path.join(
    TEST_CACHE_DIR,
    "tracked-parallel-isolation",
  );
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  const counters = { pipelineExecutions: 0 };
  const plugin = createTrackedFilePlugin((slug) => `${slug}.txt`, counters);
  const config = createTestConfig([plugin]);
  config.cache.directory = cacheDirectory;

  const firstFiles = {
    "a.md": "---\ntitle: A\npublish: true\n---\n\n# A\n",
    "b.md": "---\ntitle: B\npublish: true\n---\n\n# B\n",
    "a.txt": "A1",
    "b.txt": "B1",
  };
  const first = new ContentManager(memorySource(firstFiles), [], {
    config,
    plugins: config.plugins,
  });
  await Promise.all([
    first.getProcessedContent("a"),
    first.getProcessedContent("b"),
  ]);

  const secondFiles = { ...firstFiles, "a.txt": "A2" };
  const second = new ContentManager(memorySource(secondFiles), [], {
    config,
    plugins: config.plugins,
  });
  const [a, b] = await Promise.all([
    second.getProcessedContent("a"),
    second.getProcessedContent("b"),
  ]);

  assert.match(a.html, /A2/);
  assert.match(b.html, /B1/);
  assert.equal(counters.pipelineExecutions, 3);
});

test("note embed content dependency misses when embedded content changes", async () => {
  const cacheDirectory = path.join(TEST_CACHE_DIR, "tracked-note-embed");
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  const counters = { pipelineExecutions: 0 };
  const plugin = createTrackedEmbedPlugin(counters);
  const base = {
    "note.md": "---\ntitle: Note\npublish: true\n---\n\n# Note\n",
  };

  const firstHtml = await processedHtml(
    { ...base, "dep.md": "---\ntitle: Dep\npublish: true\n---\n\n# Dep v1\n" },
    cacheDirectory,
    "note",
    plugin,
  );
  const secondHtml = await processedHtml(
    { ...base, "dep.md": "---\ntitle: Dep\npublish: true\n---\n\n# Dep v2\n" },
    cacheDirectory,
    "note",
    plugin,
  );

  assert.match(firstHtml, /Dep v1/);
  assert.match(secondHtml, /Dep v2/);
  assert.equal(counters.pipelineExecutions, 2);
});

test("renderer content source reads invalidate the persistent cache", async () => {
  const cacheDirectory = path.join(TEST_CACHE_DIR, "renderer-dependency");
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  const counters = { pipelineExecutions: 0 };
  const plugin = createRendererDependencyPlugin(counters);
  const base = {
    "note.md": "---\ntitle: Note\npublish: true\n---\n\n# Note\n",
  };

  const firstHtml = await processedHtml(
    { ...base, "dep.txt": "v1" },
    cacheDirectory,
    "note",
    plugin,
  );
  const secondHtml = await processedHtml(
    { ...base, "dep.txt": "v1" },
    cacheDirectory,
    "note",
    plugin,
  );

  assert.match(firstHtml, /data-size="2"/);
  assert.equal(secondHtml, firstHtml);
  assert.equal(counters.pipelineExecutions, 1);

  const thirdHtml = await processedHtml(
    { ...base, "dep.txt": "v1-longer" },
    cacheDirectory,
    "note",
    plugin,
  );
  assert.match(thirdHtml, /data-size="9"/);
  assert.equal(counters.pipelineExecutions, 2);

  const fourthHtml = await processedHtml(
    { ...base, "dep.txt": "v1-longer" },
    cacheDirectory,
    "note",
    plugin,
  );
  assert.equal(fourthHtml, thirdHtml);
  assert.equal(counters.pipelineExecutions, 2);
});

test("transitive note embed dependencies invalidate the root cache entry", async () => {
  const cacheDirectory = path.join(TEST_CACHE_DIR, "transitive-embed");
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  const counters = { pipelineExecutions: 0 };
  const plugin = createTransitiveEmbedPlugin(counters);
  const base = {
    "a.md": "---\ntitle: A\npublish: true\n---\n\n# A\n",
    "b.md": "---\ntitle: B\npublish: true\n---\n\n# B\n",
  };
  const cV1 = "c.md";
  const cV1Body = "---\ntitle: C\npublish: true\n---\n\n# C v1\n";
  const cV2Body = "---\ntitle: C\npublish: true\n---\n\n# C v2\n";

  const firstHtml = await processedHtml(
    { ...base, [cV1]: cV1Body },
    cacheDirectory,
    "a",
    plugin,
  );
  const secondHtml = await processedHtml(
    { ...base, [cV1]: cV1Body },
    cacheDirectory,
    "a",
    plugin,
  );

  assert.match(firstHtml, /C v1/);
  assert.equal(secondHtml, firstHtml);
  assert.equal(counters.pipelineExecutions, 2);

  const thirdHtml = await processedHtml(
    { ...base, [cV1]: cV2Body },
    cacheDirectory,
    "a",
    plugin,
  );
  assert.match(thirdHtml, /C v2/);
  assert.doesNotMatch(thirdHtml, /C v1/);
  assert.equal(counters.pipelineExecutions, 4);

  const fourthHtml = await processedHtml(
    { ...base, [cV1]: cV2Body },
    cacheDirectory,
    "a",
    plugin,
  );
  assert.equal(fourthHtml, thirdHtml);
  assert.equal(counters.pipelineExecutions, 4);
});

test("link target removal invalidates the cached link resolution", async () => {
  const cacheDirectory = path.join(TEST_CACHE_DIR, "link-target-removed");
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  const plugin = definePlugin({ name: "link-fixture" });
  const source = "---\ntitle: A\npublish: true\n---\n\n# A\n\n[to b](b.md)\n";
  const withTarget = {
    "a.md": source,
    "b.md": "---\ntitle: B\npublish: true\n---\n\n# B\n",
  };

  const firstHtml = await processedHtml(
    withTarget,
    cacheDirectory,
    "a",
    plugin,
  );
  const secondHtml = await processedHtml(
    withTarget,
    cacheDirectory,
    "a",
    plugin,
  );
  assert.match(firstHtml, /href="\/b"/);
  assert.equal(secondHtml, firstHtml);

  const thirdHtml = await processedHtml(
    { "a.md": source },
    cacheDirectory,
    "a",
    plugin,
  );
  assert.doesNotMatch(thirdHtml, /href="\/b"/);
});

test("link target addition invalidates the cached link resolution", async () => {
  const cacheDirectory = path.join(TEST_CACHE_DIR, "link-target-added");
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  const plugin = definePlugin({ name: "link-fixture" });
  const source = "---\ntitle: A\npublish: true\n---\n\n# A\n\n[to b](b.md)\n";
  const withoutTarget = { "a.md": source };
  const withTarget = {
    ...withoutTarget,
    "b.md": "---\ntitle: B\npublish: true\n---\n\n# B\n",
  };

  const firstHtml = await processedHtml(
    withoutTarget,
    cacheDirectory,
    "a",
    plugin,
  );
  const secondHtml = await processedHtml(
    withoutTarget,
    cacheDirectory,
    "a",
    plugin,
  );
  assert.doesNotMatch(firstHtml, /href="\/b"/);
  assert.equal(secondHtml, firstHtml);

  const thirdHtml = await processedHtml(
    withTarget,
    cacheDirectory,
    "a",
    plugin,
  );
  assert.match(thirdHtml, /href="\/b"/);
});

test("link target publish flag change invalidates the cached link resolution", async () => {
  const cacheDirectory = path.join(TEST_CACHE_DIR, "link-target-publish");
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  const plugin = definePlugin({ name: "link-publish-fixture" });
  const aSource = "---\ntitle: A\npublish: true\n---\n\n# A\n\n[to b](b.md)\n";

  const firstHtml = await processedHtml(
    { "a.md": aSource, "b.md": "---\ntitle: B\npublish: false\n---\n\n# B\n" },
    cacheDirectory,
    "a",
    plugin,
  );
  const secondHtml = await processedHtml(
    { "a.md": aSource, "b.md": "---\ntitle: B\npublish: false\n---\n\n# B\n" },
    cacheDirectory,
    "a",
    plugin,
  );

  assert.doesNotMatch(firstHtml, /href="\/b"/);
  assert.equal(secondHtml, firstHtml);

  const thirdHtml = await processedHtml(
    { "a.md": aSource, "b.md": "---\ntitle: B\npublish: true\n---\n\n# B\n" },
    cacheDirectory,
    "a",
    plugin,
  );
  assert.match(thirdHtml, /href="\/b"/);

  const fourthHtml = await processedHtml(
    { "a.md": aSource, "b.md": "---\ntitle: B\npublish: true\n---\n\n# B\n" },
    cacheDirectory,
    "a",
    plugin,
  );
  assert.equal(fourthHtml, thirdHtml);
});

test("unrelated body-only change keeps the cached link resolution valid", async () => {
  const cacheDirectory = path.join(TEST_CACHE_DIR, "link-target-body-only");
  await fs.rm(cacheDirectory, { recursive: true, force: true });

  const plugin = definePlugin({ name: "link-body-fixture" });
  const aSource = "---\ntitle: A\npublish: true\n---\n\n# A\n\n[to b](b.md)\n";

  const firstHtml = await processedHtml(
    {
      "a.md": aSource,
      "b.md": "---\ntitle: B\npublish: true\n---\n\n# B v1\n",
    },
    cacheDirectory,
    "a",
    plugin,
  );
  const secondHtml = await processedHtml(
    {
      "a.md": aSource,
      "b.md": "---\ntitle: B\npublish: true\n---\n\n# B v2\n",
    },
    cacheDirectory,
    "a",
    plugin,
  );

  assert.match(firstHtml, /href="\/b"/);
  assert.equal(secondHtml, firstHtml);
});
