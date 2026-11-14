---
date: 2026-10-14
title: Content Collection
sidebar.hidden: true
---

# Content Collection

A grouping of content entries produced for queries, defined by a kind such as tags, folder, date, or a frontmatter field. Taxonomy pages, archives, and series lists are built from collections.

## Kinds

A collection selects entries by one dimension:

- `tags` — entries sharing a tag.
- `folder` — entries under a directory.
- `date` — entries grouped by year, month, or day.
- a frontmatter field — entries sharing a value, as used by [series](./series.md).

## Selecting entries

```ts
{
  kind: "notes",
  groupBy: { by: "tags" },
  basePath: "/tags",
  filter: { tags: { any: ["notes"] } },
  sort: { field: "date", order: "desc" },
}
```

## Content collection definition

A `ContentCollection` is defined by a `ContentCollectionDefinition`. `kind` is a stable identifier, `groupBy` selects the grouping dimension, and `basePath` is the site-local path prefix for the generated listings. `filter`, `sort`, `order`, and `locale` are optional. `filter` is a `ContentQueryFilter` object, not a predicate function. The `buildContentCollections` function (`packages/core/src/content/content_collection.ts`) groups manifest entries into listings with pagination, sort, and filter support.

Example `ContentCollectionDefinition`:

```ts
{
  kind: "tags",
  groupBy: { by: "tags" },
  basePath: "/tags",
}
```

Example with filter and sort:

```ts
{
  kind: "archive",
  groupBy: { by: "date", granularity: "month" },
  basePath: "/archive",
  filter: { date: { from: "2026-01-01" } },
  sort: { field: "date", order: "desc" },
}
```

Grouping dimensions (`groupBy.by`):

- `tags` — entries sharing a tag
- `folder` — entries under a directory
- `date` — entries grouped by year, month, or day
- `frontmatter` — entries sharing a frontmatter field value, as used by series

## Related terms
