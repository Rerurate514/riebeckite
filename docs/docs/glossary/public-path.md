---
date: 2026-10-14
title: Public Path
sidebar:
  hidden: true
---

# Public Path

The path portion of a note's public URL, before the site origin is added. It is what a link uses after the permalink has been resolved.

## Public path

For the permalink `https://example.com/docs/hello/`, the public path is `/docs/hello/`. The [permalink](./permalink.md) is the full value; the public path is its path part.

## Where it appears

Routing, sitemaps, and generated links all work with public paths. They come from the resolved location, so a change in URL rules propagates without editing content.

## Public path type and resolution

The public path is the path portion of a note's public URL, before the site origin is added. It is derived from the `ContentPublicLocation` (`packages/core/src/types/content_manifest.ts`) which is resolved during location resolution.

Key properties:

- **Source**: Computed from the resolved permalink by stripping the site origin (e.g., for `https://example.com/docs/hello/`, the public path is `/docs/hello/`)
- **Usage**: Used by routing rules, sitemap generation, and internal link generation. The integration renders links using the public path after the permalink has been resolved.
- **Propagation**: A change in URL rules (permalink plugin, config change) propagates to all public paths without requiring content file edits

Example public path values:

```ts
// For permalink "https://example.com/docs/hello/": public path is "/docs/hello/"
// For permalink "https://example.com/blog/post-1/": public path is "/blog/post-1/"
```

Example in sitemap generation:

```ts
// Generates <url><loc>https://example.com/docs/hello/</loc></url>
// The /docs/hello/ part is the public path
```
