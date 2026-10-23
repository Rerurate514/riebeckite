---
date: 2026-10-14
title: Cache Version
sidebar:
  hidden: true
---

# Cache Version

The schema version of the persistent content cache that controls compatibility and migration between cache schema versions.

## Schema versions

CONTENT_CACHE_SCHEMA_VERSION (currently 5) increments when the cache structure changes.
CONTENT_CACHE_COMPATIBILITY_VERSION (currently 3) changes when behavior or contracts change.
Entries with a mismatched schema version are treated as misses and reprocessed.

## Migration

Delete `.riebeckite/cache` to force cold processing when the schema version does not match.
The build log reports `schema-miss` when a cache entry has an incompatible schema version.

## Schema Version Constants
The cache versioning is controlled by two constants defined in `packages/core/src/content/content_persistent_cache.ts`:

- **CONTENT_CACHE_SCHEMA_VERSION** (currently **5**): Increments when the cache structure changes. Entries with a mismatched schema version are treated as misses and reprocessed.
- **CONTENT_CACHE_COMPATIBILITY_VERSION** (currently **3**): Changes when behavior or contracts change.

## Cache Lookup Compatibility Check

During cache lookups, the `lookup` method in `createPersistentContentCache` (`packages/core/src/content/content_persistent_cache.ts`) checks `entry.schemaVersion !== CONTENT_CACHE_SCHEMA_VERSION`. If the versions differ, the entry is treated as a `schema-miss` and reprocessed from scratch. This ensures that any structural changes to the cache schema are always picked up on the next build.

## Cache Entry Structure

The persistent content cache entry (`PersistentContentCacheEntry` type in `packages/core/src/content/content_persistent_cache.ts`) structure:

```json
{
  "schemaVersion": 5,
  "key": "<computed cache key>",
  "dependencies": [
    { "kind": "content", "id": "slug-name", "fingerprint": "sha256 hash" },
    { "kind": "file", "id": "path/to/file", "fingerprint": "sha256 hash" },
    { "kind": "link", "id": "link-target-slug", "fingerprint": "sha256 hash" }
  ],
  "value": {
    "frontmatter": { "title": "Example", "date": "2024" },
    "html": "<p>processed HTML</p>"
  }
}
```

The entry includes `schemaVersion` (currently 5), `key` (computed via `computeContentCacheKey` from slug, source, frontmatter, and pipeline fingerprint), `dependencies` (array of `CachedContentDependency` records), and `value` (frontmatter and HTML). If `entry.key !== key` during lookup, the entry is treated as a `key-miss`.

## Related terms

- [[glossary/cache|Cache]]
- [[persistent-cache|Persistent Cache]]
- [[fingerprint|Fingerprint]]

## Learn more

- [Build System](../framework/build-system.md)
