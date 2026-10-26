---
date: 2026-10-14
title: Search
sidebar:
  hidden: true
---

# Search

The build-time search index and plugin that let readers query content, built from the manifest.

## Search index

The search index is generated at build time from the manifest and contains entries with their slug, permalink, title, body, tags, and headings. Readers can query the index using the search plugin, which supports text search and filter by tag, language, or path.

```ts
import { searchItems } from "@riebeckite/plugin-search";

const results = searchItems(manifest.entries, "plugin");
```

## Search index generation
The search index is generated at build time by the search plugin (`packages/plugins/search/`). It is built from the manifest and contains entries with their `slug`, `permalink`, `title`, `body`, `tags`, and `headings`. The index is generated using `searchItems` function, which supports:

- **Text search**: Full-text search against entry body and headings
- **Tag filter**: Filter results by tags specified in frontmatter
- **Language filter**: Filter results by language (using the entry's locale)
- **Path filter**: Filter results by URL path

```ts
import { searchItems } from "@riebeckite/plugin-search";
// Example: search for entries with tag "plugin"
const results = searchItems(manifest.entries, "plugin", { tags: ["plugin"] });
// Example: search in Japanese
const results = searchItems(manifest.entries, "plugin", { lang: "ja" });
```

The search plugin is registered during site setup and provides the search UI integration. Results are sorted by relevance, considering tag matches, language priority, and path proximity.

## Related terms

- [[content-index|Content Index]]
- [[content-query|Content Query]]
- [[manifest|Manifest]]

## Learn more

- [../plugins/search.md]