import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import { type Logger, NoopTracer } from "../src/observability.js";
import type { ContentManifest } from "../src/types/content_manifest.js";
import { definePlugin, type RiebeckitePlugin } from "../src/types/plugin.js";
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
  plugins: readonly RiebeckitePlugin[] = [],
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
      directory: path.join(directory, "content"),
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
    plugins: [...plugins],
    cache: { enabled: true, directory: path.join(directory, "cache") },
  };
}

function contentStatePath(directory: string): string {
  return path.join(directory, "build", "content-state.json");
}

async function readIfPresent(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function normalizeManifest(manifest: ContentManifest): unknown {
  return JSON.parse(JSON.stringify(manifest));
}

async function runBuild(
  files: Record<string, string>,
  directory: string,
  plugins: readonly RiebeckitePlugin[] = [],
): Promise<ContentManifest> {
  const config = testConfig(directory, plugins);
  const manager = new ContentManager(memorySource(files), [], {
    config,
    plugins: config.plugins,
  });
  try {
    return await manager.build({ incremental: true });
  } finally {
    await manager.dispose();
  }
}

async function runBuildExpectingFailure(
  files: Record<string, string>,
  directory: string,
  plugins: readonly RiebeckitePlugin[] = [],
): Promise<Error> {
  try {
    await runBuild(files, directory, plugins);
  } catch (error) {
    assert.ok(error instanceof Error);
    return error;
  }
  return assert.fail("expected the build to fail");
}

async function tempDirectory(name: string): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), `riebeckite-${name}-`));
}

const goodFiles = {
  "a.md": "---\ntitle: A\nvisibility: public\n---\n\n# A\n",
  "b.md": "---\ntitle: B\nvisibility: public\n---\n\n# B\n",
  "c.md": "---\ntitle: C\nvisibility: public\n---\n\n# C\n",
};

const brokenB = '---\ntitle: "unterminated\n---\n\n# B\n';

test("F1 malformed frontmatter identifies the file and does not commit a partial build state", async () => {
  const directory = await tempDirectory("f1-frontmatter");
  const clean = await runBuild(goodFiles, directory);
  const stateBefore = await readIfPresent(contentStatePath(directory));
  assert.ok(stateBefore, "the good build writes a content build state");

  const error = await runBuildExpectingFailure(
    { ...goodFiles, "b.md": brokenB },
    directory,
  );
  assert.equal(error.name, "YAMLParseError");
  assert.match(error.message, /line \d+, column \d+/);
  assert.equal((error as { path?: string }).path, "b.md");

  assert.equal(
    await readIfPresent(contentStatePath(directory)),
    stateBefore,
    "a failed build must leave the previous build state untouched",
  );

  const recovered = await runBuild(goodFiles, directory);
  assert.deepEqual(normalizeManifest(recovered), normalizeManifest(clean));

  const fresh = await tempDirectory("f1-fresh");
  const freshManifest = await runBuild(goodFiles, fresh);
  assert.deepEqual(
    normalizeManifest(recovered),
    normalizeManifest(freshManifest),
    "incremental recovery must equal a fresh clean build",
  );
});

test("F5 a mid-build plugin hook failure preserves the previous build state and recovers", async () => {
  const directory = await tempDirectory("f5-plugin");
  const fixed = definePlugin({
    name: "flaky",
    onPostProcessed: () => {},
  });
  const clean = await runBuild(goodFiles, directory, [fixed]);
  const stateBefore = await readIfPresent(contentStatePath(directory));

  const throwing = definePlugin({
    name: "flaky",
    onPostProcessed: ({ slug }) => {
      if (slug === "b") throw new Error("boom during postProcess");
    },
  });
  const error = await runBuildExpectingFailure(goodFiles, directory, [
    throwing,
  ]);
  assert.equal(error.name, "PluginHookError");
  assert.match(error.message, /Plugin "flaky" failed during "onPostProcessed"/);
  assert.ok(error.cause instanceof Error);
  assert.match((error.cause as Error).message, /boom during postProcess/);

  assert.equal(
    await readIfPresent(contentStatePath(directory)),
    stateBefore,
    "the failed build must not commit a stale or partial build state",
  );

  const recovered = await runBuild(goodFiles, directory, [fixed]);
  assert.deepEqual(normalizeManifest(recovered), normalizeManifest(clean));
});

test("F7 a generated output failure does not commit a partial build state", async () => {
  const directory = await tempDirectory("f7-generated");
  const fixed = definePlugin({
    name: "emitter",
    buildEnd: ({ output }) => {
      output.emit({ path: "feed.xml", content: "<feed />" });
    },
  });
  const clean = await runBuild(goodFiles, directory, [fixed]);
  const stateBefore = await readIfPresent(contentStatePath(directory));

  const failing = definePlugin({
    name: "emitter",
    buildEnd: ({ output }) => {
      output.emit({ path: "feed.xml", content: "<feed />" });
      throw new Error("generation failed after emit");
    },
  });
  const error = await runBuildExpectingFailure(goodFiles, directory, [failing]);
  assert.equal(error.name, "PluginHookError");
  assert.match((error.cause as Error).message, /generation failed after emit/);

  assert.equal(
    await readIfPresent(contentStatePath(directory)),
    stateBefore,
    "a failed generated output must not be committed as build state",
  );

  const recovered = await runBuild(goodFiles, directory, [fixed]);
  assert.deepEqual(normalizeManifest(recovered), normalizeManifest(clean));
});

test("F8 corrupted persistent content cache entries are ignored and rebuilt", async () => {
  const directory = await tempDirectory("f8-cache");
  const clean = await runBuild(goodFiles, directory);
  const cacheRoot = path.join(directory, "cache");
  const entries = await collectFiles(cacheRoot);
  assert.ok(entries.length > 0, "the build wrote persistent cache entries");
  for (const entry of entries) {
    await fs.writeFile(entry, "{ this is not valid json");
  }

  const recovered = await runBuild(goodFiles, directory);
  assert.deepEqual(normalizeManifest(recovered), normalizeManifest(clean));
});

test("F9 corrupted content build state falls back to a cold build", async () => {
  const directory = await tempDirectory("f9-state");
  const clean = await runBuild(goodFiles, directory);
  await fs.writeFile(contentStatePath(directory), "{ broken");

  const recovered = await runBuild(goodFiles, directory);
  assert.deepEqual(normalizeManifest(recovered), normalizeManifest(clean));
});

test("F6 a page type route collision identifies the plugins and leaves state intact", async () => {
  const directory = await tempDirectory("f6-pagetype");
  await runBuild(goodFiles, directory);
  const stateBefore = await readIfPresent(contentStatePath(directory));

  const page = (name: string): RiebeckitePlugin =>
    definePlugin({
      name,
      pageTypes: [
        {
          id: `${name}-page`,
          resolve: ({ pathname }) =>
            pathname === "/same"
              ? { type: "unused", pathname, body: "" }
              : null,
        },
      ],
    });
  const collision = [page("first"), page("second")];
  const config = testConfig(directory, collision);
  const manager = new ContentManager(memorySource(goodFiles), [], {
    config,
    plugins: config.plugins,
  });
  try {
    await assert.rejects(manager.resolvePage("/same"), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /first-page/);
      assert.match(error.message, /second-page/);
      return true;
    });
  } finally {
    await manager.dispose();
  }

  assert.equal(await readIfPresent(contentStatePath(directory)), stateBefore);
});

test("F8 a blocked disposable content cache must not fail the build", async () => {
  const directory = await tempDirectory("f8-cache-blocked");
  const clean = await runBuild(goodFiles, directory);
  await fs.rm(path.join(directory, "cache"), { recursive: true, force: true });
  await fs.writeFile(path.join(directory, "cache"), "not a directory");

  const warnings: string[] = [];
  const config = testConfig(directory);
  const logger: Logger = {
    debug() {},
    info() {},
    warn(message: string) {
      warnings.push(message);
    },
    error() {},
    child() {
      return logger;
    },
  };
  const manager = new ContentManager(memorySource(goodFiles), [], {
    config,
    observability: {
      logger,
      tracer: new NoopTracer(),
    },
  });
  let recovered: ContentManifest;
  try {
    recovered = await manager.build({ incremental: false });
  } finally {
    await manager.dispose();
  }

  assert.deepEqual(normalizeManifest(recovered), normalizeManifest(clean));
  assert.ok(
    warnings.some((warning) => /could not be written/.test(warning)),
    `expected a cache warning, received ${JSON.stringify(warnings)}`,
  );
});

async function collectFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(full);
      else results.push(full);
    }
  };
  try {
    await visit(root);
  } catch {
    return results;
  }
  return results;
}
