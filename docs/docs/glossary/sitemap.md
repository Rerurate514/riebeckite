---
title: Sitemap
sidebar:
  hidden: true
---

# Sitemap

A generated sitemap/robots listing discoverable URLs for search engines, built from the manifest.

## Sitemap generation

The sitemap is generated from the manifest's discoverable entries and includes URLs with their lastmod, changefreq, and priority values. It is used by search engines to discover and index site content.

```ts
import { buildSitemap } from "@riebeckite/plugins/seo";

const sitemap = buildSitemap(manifest.discoverableEntries);
```

## Related terms

- [[feed|Feed]]
- [[discoverable|Discoverable]]
- [[glossary/permalink|Permalink]]

## Learn more

- [../plugins/seo.md]