---
title: Alias
sidebar:
  hidden: true
---

# Alias

An alternative name for a note, recorded in the manifest as an extra lookup key. Aliases resolve wikilinks to the same note without changing its slug or permalink, and a name used twice becomes ambiguous.

## Setting aliases

```yaml
---
aliases: [Getting Started, Quick Start]
---
```

## Resolution and ambiguity

Each alias is registered in the [content index](./content-index.md) as a key that resolves to this note. If two notes claim the same alias, the key becomes ambiguous and links using it are reported.
