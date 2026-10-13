---
title: Fingerprint
sidebar:
  hidden: true
---

# Fingerprint

A hash that identifies a content or file input so the build can detect change. When a fingerprint differs from the stored one, the dependent content is reprocessed.

## Role

- Detects whether an input changed.
- Drives cache and build-state comparison.

## Related terms

- [[glossary/build-dependency|Build Dependency]]
- [[cache-invalidation|Cache Invalidation]]
- [[build-state|Build State]]

## Learn more

- [Build System](../framework/build-system.md)
