---
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

## Related terms

- [[content-collection|Content Collection]]
- [[glossary/taxonomy|Taxonomy]]
- [[glossary/series|Series]]
- [[manifest|Manifest]]

## Learn more

- [../plugins/query.md]