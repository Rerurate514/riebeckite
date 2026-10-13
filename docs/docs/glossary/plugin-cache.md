---
title: Plugin Cache
sidebar:
  hidden: true
---

# Plugin Cache

Plugin-local storage for processed content, versioned by cacheVersion. A plugin opts in through its processed-content cache contract so entries can be reused across builds when their declared dependencies are unchanged.

## Role

- Reuses processed content across builds.
- Versioned and tied to declared dependencies.

## Related terms

- [[plugin|Plugin]]
- [[fingerprint|Fingerprint]]
- [[cache-invalidation|Cache Invalidation]]
- [[glossary/build-dependency|Build Dependency]]

## Learn more

- [Build System](../framework/build-system.md)
- [Build Dependency Contract](../framework/build-dependency.md)
