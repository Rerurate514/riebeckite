---
title: SSG
sidebar:
  hidden: true
---

# SSG

Static site generation in Riebeckite, where the build renders the site to static files ahead of time. Core handles content and locations, and the integration connects to HonoX and Vite to render routes and write output.

## Role

Renders the site to static files before deployment.
Uses the output cache to reuse unchanged routes.

## Integration

Core handles content and locations; the integration connects to HonoX and Vite to render routes and write output.

## Output Cache

The output cache stores rendered route results keyed by route path and fingerprint. On subsequent builds, unchanged routes are restored from the cache rather than re-rendered. The cache key is derived from the output inventory comparison, which determines which routes have changed since the last build.

### Example

```sh
# Output cache hit — unchanged routes are restored from cache
riebeckite build

# Output cache miss — changed routes are re-rendered
riebeckite build --full
```

## Related terms

- [[build|Build]]
- [[output-inventory|Output Inventory]]
- [[glossary/deployment|Deployment]]
- [[incremental-build|Incremental Build]]

## Learn more

- [HonoX Integration](../framework/honox-integration.md)
