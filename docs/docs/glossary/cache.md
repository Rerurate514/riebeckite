---
title: Cache
sidebar:
  hidden: true
---

# Cache

Reusable build data that Riebeckite stores under `.riebeckite/` to avoid repeating expensive work. A cache is always an optimization: removing it changes build speed, never the published output.

## Where caches live

- `.riebeckite/cache` — processed content, including per-plugin caches.
- `.riebeckite/build/content-state.json` — the state of the previous build.
- `.riebeckite/ssg-output-cache.json` — rendered output; local only.
The first two are safe to persist between CI runs. The output cache is local and is not meant to be shared.

## A cache is not a source of truth

A missing, incompatible, or unsafe cache entry causes a full build path, not an error. State is written only after a successful build, so a failed build keeps the previous valid state.

## Configuration

Caching is controlled by the `cache` settings:

```ts
cache: {
  enabled: true,
}
```

## Related terms

- [[plugin-cache|Plugin cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[build-state|Build State]]
- [[incremental-build|Incremental Build]]

## Learn more

- [Cache](../reference/configuration/cache.md)
