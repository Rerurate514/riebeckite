---
title: Content Graph
sidebar:
  hidden: true
---

# Content Graph

The network of relationships between content entries, built from resolved wikilinks and Markdown links. It answers which notes link to which and supports backlink and neighborhood queries.

## Edges

A resolved [WikiLink](./wikilink.md) or Markdown link creates a directed edge from the source entry to the target. An [embed](./embed.md) creates an edge too, and is tracked as a dependency.

## Queries

```ts
graph.outgoing(slug);   // entries this note links to
graph.incoming(slug);   // backlinks
graph.neighbors(slug);  // both directions
```

## Extending it

Plugins can add relationships of their own, so a plugin can expose custom connections without changing Core.
