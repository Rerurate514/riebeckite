---
date: 2026-10-14
title: Persistent Cache
sidebar:
  hidden: true
---

# Persistent Cache

Per-content cache that stores processed Markdown results between builds under `.riebeckite/cache/content/vN`. A cache hit makes a build warm; a miss forces reprocessing.

## Cache contents

Stored under `.riebeckite/cache/content/v5`.
An entry key includes Markdown source, parsed frontmatter, the cache schema, and the processing-pipeline fingerprint.
Cached content also records logical slugs and normalized source paths rather than workspace paths, so it can be copied to a different runner or workspace on the same operating system.

## Hits, misses, and bypasses

The build log reports `Persistent content cache` line with `hits`, `misses`, and `bypasses`.
A cold build (no cache) processes everything from scratch. A warm build reuses compatible entries.
To force a cold build, delete `.riebeckite/cache`.

## Cache Key Structure

The content cache key is a SHA-256 hash computed from four inputs defined by the
`CacheKeyInputs` type. The key determines whether a cached entry can be
reused across builds.

| Input | Description |
| --- | --- |
| `slug` | The content source's slug (e.g. `"getting-started"`). |
| `source` | The raw Markdown source text, used for collision avoidance. |
| `frontmatter` | Parsed frontmatter, with `Date` values normalized to ISO strings. |
| `pipelineFingerprint` | Hash of plugins, content filters, and pipeline configuration. |

The static function `computeContentCacheKey`
receives a `CacheKeyInputs` object and returns the hex digest:

```ts
const key = computeContentCacheKey({
  slug: "getting-started",
  source: markdown,
  frontmatter: { date: new Date() },
  pipelineFingerprint: "...",
});
```

The result of `computeContentCacheKey` is the entry's `key`. It already includes the cache schema version. The file name is a separate SHA-256 hash of that key, under `.riebeckite/cache/content/v5`.

## Content Cache Directory

Processed content entries are stored under `.riebeckite/cache/content/v5`. The directory
layout is:

```
.riebeckite/cache/content/v5/
  └─ <sha256-hex-digest>.json
```

Each JSON file is a `PersistentContentCacheEntry` written to
`.riebeckite/cache/content/v5/<hash>.json`:

```json
{
  "schemaVersion": 5,
  "key": "<cache-key>",
  "dependencies": [
    { "kind": "content", "id": "...", "fingerprint": "..." },
    { "kind": "file", "id": "...", "fingerprint": "..." }
  ],
  "value": {
    "frontmatter": { ... },
    "html": "<rendered html>"
  }
}
```

The `key` field stores the entry's computed cache key, enabling diagnostics and key-mismatch detection during lookup. The file name is a separate hash of this key.

## `createPluginCache` vs `createUnavailablePluginCache`

The per-plugin runtime cache is created by `createPluginCache`
when the build is executing in build time, and falls back to
`createUnavailablePluginCache` when running in production or test
mode without a writable cache.

```ts
// Build time: full per-plugin cache with dependency tracking
const cache = createPluginCache({
  pluginName: "my-plugin",
  cacheVersion: plugin.cacheVersion,
  cacheDirectory: resolvePluginCacheDirectory(config),
  tracer,
  logger,
});

// Runtime / test: access throws
const unavailable = createUnavailablePluginCache();
```

The `createPluginCache` returns a `PluginCache` instance that
supports `get`, `set`, `delete`, and `clear` operations keyed by plugin name and
`cacheVersion`. The `createUnavailablePluginCache` returns a stub whose
operations throw, because the plugin cache is available only through an explicit build context. The choice is determined
by `options.isBuildTime` in `packages/core/src/pipeline.ts` (`cacheFor` method).
The cache implementations live in `packages/core/src/plugin/plugin_cache.ts`.

## Related terms

- [[glossary/cache|Cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[plugin-cache|Plugin cache]]

## Learn more

- [Build System](../framework/build-system.md)
