---
date: 2026-10-14
title: Fingerprint
sidebar:
  hidden: true
---

# Fingerprint

A hash that identifies a content or file input so the build can detect changes and drive cache/build-state comparison.

## Role

Detects whether an input changed.
Drives cache and build-state comparison: when a fingerprint differs from the stored one, dependent content is reprocessed.

## Types

Content fingerprint: includes source, frontmatter, pipeline fingerprint, cache schema, and plugin cacheVersion. Content fingerprints are computed from the Markdown source, parsed frontmatter, the cache schema version (`CONTENT_CACHE_SCHEMA_VERSION`, currently 5), and the pipeline fingerprint that incorporates plugin configurations, content filters, and plugin `cacheVersion` values.

Pipeline fingerprint: includes plugin fingerprints, content filters, and compatibility version. The pipeline fingerprint (`computePipelineFingerprint` in `packages/core/src/content/content_persistent_cache.ts`) incorporates plugin fingerprints (from `pluginFingerprint`), content filters (`config.content.filters`), and the compatibility version (`CONTENT_CACHE_COMPATIBILITY_VERSION`, currently 3). It is used to determine whether the processing pipeline has changed and needs content to be reprocessed.

## Related terms

- [[glossary/build-dependency|Build Dependency]]
- [[cache-invalidation|Cache Invalidation]]
- [[glossary/cache|Cache]]
- [[persistent-cache|Persistent Cache]]

## Learn more

- [Build System](../framework/build-system.md)
