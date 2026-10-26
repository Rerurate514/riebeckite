---
date: 2026-10-14
title: Cache Invalidation
sidebar:
  hidden: true
---

# Cache Invalidation

The step that drops cached content whose recorded dependencies or fingerprints changed. Invalidated entries are reprocessed and, if they feed other entries, the change propagates.

## Role

Removes entries whose inputs changed.
Propagates invalidation to dependent content transitively.

## When it happens

Cache invalidation is triggered in the following specific scenarios:

- When a content dependency's fingerprint changes: The persistent content cache entry's dependencies are checked against current content. If any `CachedContentDependency` fingerprint has changed (e.g., via `findInvalidDependency` in `packages/core/src/pipeline.ts`), the entry is invalidated.
- When a plugin's processedContentCache contract is violated: If a plugin's `dependencyMode` is `tracked` and it reads content or files through Core APIs that have changed since the last build, the processed content cache entry is invalidated.
- On cache version mismatch or schema mismatch: If `entry.schemaVersion !== CONTENT_CACHE_SCHEMA_VERSION` (currently 5) during cache lookup, the entry is treated as a `schema-miss` and reprocessed from scratch.
- When external dependencies change: External dependency fingerprints or scopes that have changed cause corresponding cache entries to be invalidated.

## Related terms

- [[glossary/cache|Cache]]
- [[fingerprint|Fingerprint]]
- [[glossary/build-dependency|Build Dependency]]
- [[plugin-cache|Plugin cache]]

## Learn more

- [Build System](../framework/build-system.md)
