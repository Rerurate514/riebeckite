---
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

Content fingerprint: includes source, frontmatter, pipeline fingerprint, cache schema, and plugin cacheVersion.
Pipeline fingerprint: includes plugin fingerprints, content filters, and compatibility version.

## Related terms

- [[glossary/build-dependency|Build Dependency]]
- [[cache-invalidation|Cache Invalidation]]
- [[glossary/cache|Cache]]
- [[persistent-cache|Persistent Cache]]

## Learn more

- [Build System](../framework/build-system.md)
