---
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
