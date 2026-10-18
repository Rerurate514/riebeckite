---
title: Cache
sidebar:
  hidden: true
---

# Cache

Reusable build data that Riebeckite stores under `.riebeckite/` to avoid repeating expensive work. A cache is always an optimization: removing it changes build speed, never the published output.

## Where caches live

- `.riebeckite/cache` — processed content, including per-plugin caches.
- `.riebeckite/build/content-state.json` — the state of the previous build.
- `.riebeckite/ssg-output-cache.json` — rendered output, with its `.riebeckite/ssg-output-cache.entries` directory and `.riebeckite/ssg-output-cache.fast-path.json` sidecar.
All three are safe to persist between CI runs, and the generated GitHub Actions workflow restores them. Riebeckite validates every restored cache before use, so a stale or incompatible entry causes a full build instead of a wrong output.

## A cache is not a source of truth

A missing, incompatible, or unsafe cache entry causes a full build path, not an error. State is written only after a successful build, so a failed build keeps the previous valid state.

## Configuration

Caching is controlled by the `cache` settings:

```ts
cache: {
  enabled: true,
}
```

## Cache key composition

Each content item's cache key is composed of four inputs: its slug, the raw source text, its frontmatter, and a pipeline fingerprint that captures the active config and plugin versions. This ensures that any change to the content, its metadata, or the build pipeline invalidates the cached result.

```ts
export function computeContentCacheKey(inputs: CacheKeyInputs): string {
  const { slug, source, frontmatter, pipelineFingerprint } = inputs;
  const normalizedFrontmatter = normalizeFrontmatterForCache(frontmatter);
  const keyData = {
    schemaVersion: CONTENT_CACHE_SCHEMA_VERSION,
    slug,
    source,
    frontmatter: normalizedFrontmatter as JsonValue,
    pipelineFingerprint,
  };
  return hash(stableStringify(keyData as JsonValue));
}
```

The key is stored under `.riebeckite/cache/v4/<hash>.json`, where `v4` is the current schema version (`CONTENT_CACHE_SCHEMA_VERSION = 4`). Entries from older schema versions are treated as mismatches and regenerated.

## Schema and compatibility versions

- **Schema version** (`CONTENT_CACHE_SCHEMA_VERSION = 4`): increments when the cache entry structure changes (added/removed fields, type changes). A mismatch causes a cache miss and regeneration.
- **Compatibility version** (`CONTENT_CACHE_COMPATIBILITY_VERSION = 3`): increments when the pipeline fingerprint logic changes (e.g., how plugins are fingerprinted). A mismatch also causes a cache miss.

Both versions are embedded in every cache entry. The pipeline fingerprint (`computePipelineFingerprint`) combines plugin fingerprints, content filters, and an optional content-scope fingerprint into a single hash. If any plugin's `processedContentCache` contract changes, or if `content.filters.publishStrategy` changes, the pipeline fingerprint changes and all cache entries are effectively invalidated.

## Dependency-tracked vs global cache modes

Plugins can declare their `processedContentCache.dependencyMode` to control how cache safety is assessed:

- **`none`**: The plugin’s output depends only on the current content source, frontmatter, and plugin options. No external dependencies are tracked.
- **`tracked`**: External content and file inputs are read only through framework-owned APIs that record dependency fingerprints. The cache remains valid only if those fingerprints match.
- **`global`**: The cache depends on the resolved content-location set (all published pages). Any change to any content item’s location invalidates the cache.
- **`unsafe`**: The plugin can affect processed content without a `processedContentCache` contract, so the cache must bypass this plugin.

The `hasGlobalContentDependency` utility checks whether any enabled plugin uses `dependencyMode: "global"`, which triggers a full content-scope fingerprint during incremental builds.

## Related terms

- [[plugin-cache|Plugin cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[build-state|Build State]]
- [[incremental-build|Incremental Build]]
- [[fingerprint|Fingerprint]]

```ts
cache: {
  enabled: true,
}
```

## Related terms

- [[plugin-cache|Plugin cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[build-state|Build State]]
- [[incremental-build|Incremental Build]]

## Learn more

- [Cache](../reference/configuration/cache.md)
