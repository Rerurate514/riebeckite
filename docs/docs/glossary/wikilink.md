---
title: WikiLink
sidebar:
  hidden: true
---

# WikiLink

The `[[link]]` syntax that connects notes and creates relationships in the content graph. Riebeckite resolves it through the content index, and an unresolved link stays as a diagnostic.

## Syntax

```md
[[target]]              # link by name
[[target|label]]        # link with a label
[[target#Heading]]      # link to a heading
[[glossary/theme]]      # explicit path, for ambiguous names
```

## Resolution

The target is looked up in the [content index](./content-index.md) after lowercasing. A match creates a graph edge; a miss renders as a broken link and is reported as a diagnostic.
