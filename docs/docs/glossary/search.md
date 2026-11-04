---
date: 2026-10-14
title: Search
sidebar:
  hidden: true
---

# Search

The build-time search index and plugin that let readers query content, built from the manifest.

## Search index

The search index is generated at build time by `buildSearchItems` from the manifest's discoverable entries. Each item contains its slug, permalink, title, aliases, headings, body, excerpt, tags, language, and date. Query the index with `searchItems`, which supports text search and `tag:`, `lang:`, and `path:` filters.

```ts
import { buildSearchItems, searchItems } from "@riebeckite/plugin-search";

const items = buildSearchItems({ manifest, config });
const results = searchItems(items, "plugin");
```

## Search index generation
The search index is generated at build time by the search plugin (`packages/plugins/search/`) from `manifest.discoverableEntries`. The index is built with `buildSearchItems`, which returns `SearchItem[]`. `searchItems` queries that array and supports:

- **Text search**: Matches slug, title, aliases, tags, headings, and body
- **Tag filter**: `tag:plugin` in the query string
- **Language filter**: `lang:ja` in the query string, or the `language` option
- **Path filter**: `path:notes` in the query string

```ts
import { buildSearchItems, searchItems } from "@riebeckite/plugin-search";

const items = buildSearchItems({ manifest, config });
const tagged = searchItems(items, "plugin tag:plugin");
const japanese = searchItems(items, "plugin", { language: "ja" });
```

The search plugin is registered during site setup and provides the search UI integration. Results are sorted by relevance across the indexed fields.

## Related terms

- [[content-index|Content Index]]
- [[content-query|Content Query]]
- [[manifest|Manifest]]

## Learn more

- [../plugins/search.md]