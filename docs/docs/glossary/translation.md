---
title: Translation
sidebar:
  hidden: true
---

# Translation

The link between versions of the same content in different languages, set through frontmatter. Translations let links and the graph follow the reader's language.

## Setting it

```yaml
---
translation: getting-started
lang: ja
---
```

## Link rewriting

When a note has a translation in the reader's language, links and [WikiLinks](./wikilink.md) to it resolve to that version. Without a translation, the original target stays.
