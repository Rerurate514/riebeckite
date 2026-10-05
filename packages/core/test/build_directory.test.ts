import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { resolveContentBuildStatePath } from "../src/content/content_build_state_store.js";
import { resolvePluginCacheDirectory } from "../src/plugin/plugin_cache.js";
import type { ResolvedRiebeckiteConfig } from "../src/types/resolved_riebeckite_config.js";

test("build directory owns plugin cache and content build state", () => {
  const config = {
    buildDirectory: path.join("site", ".riebeckite"),
    content: { directory: path.join("site", "content") },
  } as ResolvedRiebeckiteConfig;

  assert.equal(
    resolvePluginCacheDirectory(config),
    path.join("site", ".riebeckite", "cache"),
  );
  assert.equal(
    resolveContentBuildStatePath(config, undefined),
    path.join("site", ".riebeckite", "build", "content-state.json"),
  );
});

test("content-relative state locations remain the fallback", () => {
  const config = {
    content: { directory: path.join("site", "content") },
  } as ResolvedRiebeckiteConfig;

  assert.equal(
    resolvePluginCacheDirectory(config),
    path.resolve("site", ".riebeckite", "cache"),
  );
  assert.equal(
    resolveContentBuildStatePath(config, undefined),
    path.resolve("site", "content", ".riebeckite", "content-state.json"),
  );
});

test("an explicit cache directory overrides the build directory", () => {
  const config = {
    buildDirectory: path.join("site", ".riebeckite"),
    cache: {
      enabled: true,
      directory: path.join("shared", "cache"),
    },
    content: { directory: path.join("site", "content") },
  } as ResolvedRiebeckiteConfig;

  assert.equal(
    resolvePluginCacheDirectory(config),
    path.join("shared", "cache"),
  );
});
