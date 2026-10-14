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

## Sitemap generation details
The sitemap is generated using `renderSitemap` from `packages/plugins/seo/src/site-files.ts`. It produces a sitemap XML with `<url>` entries for each discoverable entry, including:

- `loc`: the URL of each entry (built from the permalink and base URL)
- `lastmod`: the last modified date of each entry (from frontmatter `updated` or `published`)
- `changefreq`: how frequently the page is likely to change
- `priority`: the priority of this URL relative to other URLs on the site

The sitemap includes the site root URL and all discoverable entry URLs (excluding the root `/` for entries). It is used by search engines to discover and index site content. The sitemap is complemented by the robots.txt file, which includes a `Sitemap:` directive pointing to the sitemap location.

```ts
import { renderSitemap } from "@riebeckite/plugin-seo";
// Usage: renderSitemap(config, entries) returns the sitemap XML string
```

## Related terms

## Related terms

- [[feed|Feed]]
- [[discoverable|Discoverable]]
- [[glossary/permalink|Permalink]]

## Learn more

- [../plugins/seo.md]