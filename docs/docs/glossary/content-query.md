---
date: 2026-10-14
title: Content Query
sidebar:
  hidden: true
---

# Content Query

Selecting and filtering content entries by tag, folder, date, or a frontmatter field for listings and plugin data; used by taxonomy, series, and related posts.

## Query methods

Content queries are resolved through the `content-query` plugin and support filtering by:

| Filter type | Description |
| --- | --- |
| `tag` | Match entries by tag |
| `folder` | Match entries by folder path |
| `date` | Match entries by publishing date |
| `frontmatter field` | Match by arbitrary frontmatter key |

```ts
import { searchItems } from "@riebeckite/plugins/search";

const results = searchItems(entries, "tag:news");
```

## Content query plugin runtime

The `content-query` plugin uses a runtime (`packages/plugins/query/src/runtime.ts`) that resolves query blocks in entry HTML. The runtime:

1. Finds query blocks marked with the `query` attribute in entry HTML
2. Parses the YAML-encoded query spec
3. Filters the manifest's `discoverableEntries` (or a provided pool) using `queryContentEntries`
4. Replaces the block with the rendered result

The `queryContentEntries` function (`packages/core/src/content/content_query.ts`) supports filtering by tags, folder, date, and frontmatter fields, and handles sorting, pagination, and grouping.

## Grouping and pagination

Content queries support grouping by tags, folder, date, or frontmatter fields, and pagination via `offset` and `limit` spec fields. The `groupContentEntries` function (`packages/core/src/content/content_query.ts`) returns `ContentQueryGroup[]` entries with group keys and member entries.

```ts
// From packages/core/src/content/content_query.ts
export function groupContentEntries(
  entries: readonly ContentManifestEntry[],
  groupBy: ContentQueryGroupBy,
  options: ContentQueryGroupOptions = {},
): ContentQueryGroup[];
```

## Related terms

- [[content-collection|Content Collection]]
- [[glossary/taxonomy|Taxonomy]]
- [[glossary/series|Series]]
- [[manifest|Manifest]]

## Learn more

- [../plugins/query.md]