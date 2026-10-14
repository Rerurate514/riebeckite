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

## Block ID resolution

A block ID like `^intro` is resolved by the content index during embed and wikilink processing. The ID is matched against the block's anchor in the source note, and the resolved path follows the pattern `![[note#^intro]]` for embeds or `[[note#^intro]]` for wikilinks.

## Block ID and content dependencies

When a block ID is used in an embed (`![[note#^intro]]`), the embedding page becomes a content dependency of the source note. Editing the source note's block invalidates the embedding page, similar to how note-level embeds are tracked.
