---
title: Plugin cache
sidebar:
  hidden: true
---

# Plugin cache

Each plugin gets a per-plugin, regenerable build-time cache via `context.cache`; store only JSON-serializable values scoped to the plugin namespace.

## Purpose and scope

The plugin cache is isolated per plugin and exists only for the duration of a build. It is not a persistent database or Cloudflare Workers storage.

```ts
context.cache.set("key", value)
const value = await context.cache.get("key")
```

## Cache invalidation

Treat a corrupt cache as a safe miss; writes are atomic. Switch compatibility with `cacheVersion` when the contract changes.

```mermaid
flowchart TD
  Work["Plugin work"]
  Cache{"Valid cache?
  Cache -->|Yes| Reuse["Reuse"]
  Cache -->|No| Regenerate["Regenerate"]
```

## Configuration

Cache behavior is controlled by `cacheVersion` on the plugin definition. Persistent processed-content cache uses `processedContentCache` with dependency modes `none`, `tracked`, `global`, or `unsafe`.

## Related terms

- [[plugin|Plugin]]
- [[plugin-dependency|Plugin dependency]]
- [[lifecycle-hook|Lifecycle hook]]
- [[glossary/diagnostics|Diagnostics]]
- [[cache-invalidation|Cache Invalidation]]
- [[cache-version|Cache Version]]

## Learn more

- [Build System](../framework/build-system.md)
- [Build Dependency Contract](../framework/build-dependency.md)
