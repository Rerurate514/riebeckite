---
title: Query Demo
description: A note that renders a content query at build time.
publish: true
tags:
  - featured
---

# Query Demo

The block below is rendered from the content manifest when the site is built.

```query
filter:
  tags:
    any: [featured]
sort:
  field: title
  order: asc
format: table
columns: [title, date]
```

RIEBECKITE_EXTERNAL_QUERY_MARKER
