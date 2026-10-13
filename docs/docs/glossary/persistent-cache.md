---
title: Persistent Cache
sidebar:
  hidden: true
---

# Persistent Cache

Per-content cache that stores processed Markdown results between builds under `.riebeckie/cache/content/vN`. A cache hit makes a build warm; a miss forces reprocessing.

## Cache contents

Stored under `.riebeckite/cache/content/v3`.
An entry key includes Markdown source, parsed frontmatter, the cache schema, and the processing-pipeline fingerprint.
Cached content also records logical slugs and normalized source paths rather than workspace paths, so it can be copied to a different runner or workspace on the same operating system.

## Hits, misses, and bypasses

The build log reports `Persistent content cache` line with `hits`, `misses`, and `bypasses`.
A cold build (no cache) processes everything from scratch. A warm build reuses compatible entries.
To force a cold build, delete `.riebeckite/cache`.

## Related terms

- [[glossary/cache|Cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[plugin-cache|Plugin cache]]

## Learn more

- [Build System](../framework/build-system.md)
