---
title: Search
sidebar:
  hidden: true
---

# Search

The build-time search index and plugin that let readers query content, built from the manifest.

## Search index

The search index is generated at build time from the manifest and contains entries with their slug, permalink, title, body, tags, and headings. Readers can query the index using the search plugin, which supports text search and filter by tag, language, or path.

```ts
import { searchItems } from "@riebeckite/plugins/search";

const results = searchItems(manifest.entries, "plugin");
```

## Related terms

- [[content-index|Content Index]]
- [[content-query|Content Query]]
- [[manifest|Manifest]]

## Learn more

- [../plugins/search.md]