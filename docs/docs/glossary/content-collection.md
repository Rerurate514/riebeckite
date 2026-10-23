---
date: 2026-10-14
title: Content Collection
sidebar:
  hidden: true
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
  kind: "tags",
  filter: (entry) => entry.frontmatter.published !== false,
  sort: "date",
  order: "desc",
}
```

## Content collection definition

A `ContentCollection` is defined by a `ContentCollectionDefinition` which specifies the `kind` and optional `filter`, `sort`, and `order` options. The `buildContentCollections` function (`packages/core/src/content/content_collection.ts`) groups manifest entries into taxonomy/date/folder-based listings with pagination, sort, and filter support.

Example `ContentCollectionDefinition`:

```ts
{
  kind: "tags",
}
```

Example with filter and sort:

```ts
{
  kind: "date",
  filter: (entry) => entry.frontmatter.published !== false,
  sort: "date",
  order: "desc",
}
```

Available kinds:

- `tags` — entries sharing a tag
- `folder` — entries under a directory
- `date` — entries grouped by year, month, or day
- a frontmatter field — entries sharing a value, as used by series

## Related terms
