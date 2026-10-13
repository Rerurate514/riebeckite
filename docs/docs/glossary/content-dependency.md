---
title: Content Dependency
sidebar:
  hidden: true
---

# Content Dependency

A recorded relationship showing that one entry's output depends on another entry. When the dependency changes, the dependent entry is reprocessed so derived content stays correct.

## What counts as a dependency

A [WikiLink](./wikilink.md), an [embed](./embed.md), or any plugin hook that reads another entry can create a content dependency. The [content graph](./content-graph.md) is one source of these relationships.

## Propagation

Dependencies feed [cache invalidation](./cache-invalidation.md). Editing a note invalidates the notes that embed it, and so on through the chain.
