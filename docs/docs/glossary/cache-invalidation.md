---
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

When a content dependency's fingerprint changes.
When a plugin's processedContentCache contract is violated.
On cache version mismatch or schema mismatch.

## Related terms

- [[glossary/cache|Cache]]
- [[fingerprint|Fingerprint]]
- [[glossary/build-dependency|Build Dependency]]
- [[plugin-cache|Plugin cache]]

## Learn more

- [Build System](../framework/build-system.md)
