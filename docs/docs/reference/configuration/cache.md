---
title: Build cache
sidebar:
  label: Build cache
  order: 50
---

# Build cache

`cache` controls the persistent cache used during builds. It is optional; the integration supplies a suitable directory by default.

| Field | Default | Meaning |
| --- | --- | --- |
| `cache.enabled` | `true` | Set to `false` to disable the persistent cache and rebuild everything. |
| `cache.directory` | `<buildDirectory>/cache` | Overrides where cache entries are stored. Set it to relocate or share the cache; an unset value keeps the integration default. |

The cache stores processed content and plugin results between builds. Disabling it or moving its directory only affects build performance, not the output; a cold build produces the same result.
