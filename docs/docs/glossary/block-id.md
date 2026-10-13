---
title: Block ID
sidebar:
  hidden: true
---

# Block ID

A short identifier attached to a paragraph or block so it can be linked or embedded directly. It makes a single block addressable without a heading.

## Syntax

```md
This paragraph can be referenced. ^intro

See ![[note#^intro]] to embed it.
```

## Use

Block ids let an [embed](./embed.md) or a [WikiLink](./wikilink.md) target one block instead of a whole note or section.
