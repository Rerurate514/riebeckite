---
title: Cache Invalidation
sidebar:
  hidden: true
---

# Cache Invalidation

The step that drops cached content whose recorded dependencies or fingerprints changed. Invalidated entries are reprocessed and, if they feed other entries, the change propagates.

## Role

- Removes entries whose inputs changed.
- Propagates invalidation to dependent content.

## Related terms

- [[glossary/cache|Cache]]
- [[fingerprint|Fingerprint]]
- [[glossary/build-dependency|Build Dependency]]
- [[plugin-cache|Plugin Cache]]

## Learn more

- [Build System](../framework/build-system.md)
- [Build Dependency Contract](../framework/build-dependency.md)
