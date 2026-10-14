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

Dependencies feed [cache invalidation](./cache-invalidation.md). When a note's content changes, the content dependency tracker (`packages/core/src/content/content_dependency_tracker.ts`) records the relationship, and the build coordinator invalidates dependent entries so that derived content (such as rendered HTML or graph edges) is regenerated on the next build.

Example dependency tracking flow:

1. Entry A is edited and contains a WikiLink to entry B
2. The content dependency tracker records B as a dependent of A
3. On next build, entry A's fingerprint changes
4. The build coordinator marks entry B as invalidated
5. Entry B's content is re-processed, ensuring derived content stays correct

Plugins can also create dependencies by reading other entries via `extendContentGraph` or custom hooks, which are then tracked alongside core-resolved dependencies.
