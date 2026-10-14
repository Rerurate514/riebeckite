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

## Link-Based Edge Resolution

The content graph constructs directed edges from resolved links in the content manifest `outgoingLinks` and `incomingLinks` maps. During the SSG build:

- **WikiLinks** `[[page]]` or `[[page#heading]]` produce a resolved note link with `kind: "note"` and the target `slug`, creating an **outgoing** edge from the source entry to the target entry.
- **Markdown links** `text` are resolved relative to the source slug; if the path matches a known content slug, an outgoing edge is created from the source to that target.
- **Unresolved links** (external URLs, attachment references) are recorded with `kind: "unresolved"` and do not create graph edges, so they do not appear in `outgoing`, `incoming`, or `neighbors` queries.

The `createContentGraph` function aggregates these link-derived edges into a queryable graph, enabling `graph.outgoing(slug)`, `graph.incoming(slug)`, and `graph.neighbors(slug)` lookups for backlink displays and related-links sections.

## Plugin Extension via `extendContentGraph`

Plugins can add custom relationships without modifying Core, by implementing `extendContentGraph`. The callback receives a `PluginGraphContext` and can push additional link references into the manifest's `outgoingLinks` or `incomingLinks` maps. These plugin-added edges are then included automatically when `createContentGraph` is called, enabling features such as "related posts", "cited-by" graphs, or table-of-contents cross-references.

```ts
// Example plugin adding a "cites" relationship
context.extendContentGraph?.({
  pluginName: "my-plugin",
  outgoing: {
    "post-a": ["post-b", "post-c"], // post-a cites post-b and post-c
  },
});
```

The resulting graph's `outgoing`, `incoming`, and `neighbors` queries will include both core-resolved and plugin-contributed edges.

## Content graph API

The `ContentGraph` type (`packages/core/src/content/content_graph.ts`) provides the following query methods:

- **`graph.outgoing(slug)`** — returns entries that the note at `slug` links to (outgoing edges)
- **`graph.incoming(slug)`** — returns backlinks to the note at `slug`
- **`graph.neighbors(slug)`** — returns entries that link to or are linked from the note at `slug` (both directions)
- **`graph.outgoingSlugs(slug)`** — returns just the slugs of outgoing targets
- **`graph.incomingSlugs(slug)`** — returns just the slugs of incoming sources
- **`graph.neighborSlugs(slug)`** — returns just the slugs of neighbors

These are built by `createContentGraph` from the manifest's `outgoingLinks` and `incomingLinks` maps. During the SSG build:

- **WikiLinks** `[[page]]` or `[[page#heading]]` produce a resolved note link with `kind: "note"` and the target `slug`, creating an **outgoing** edge from the source entry to the target entry.
- **Markdown links** `text` are resolved relative to the source slug; if the path matches a known content slug, an outgoing edge is created.
- **Unresolved links** (external URLs, attachment references) are recorded with `kind: "unresolved"` and do not create graph edges, so they do not appear in `outgoing`, `incoming`, or `neighbors` queries.

Plugins can add custom relationships via `extendContentGraph`. The callback receives a `PluginGraphContext` and can push additional link references into the manifest's `outgoingLinks` or `incomingLinks` maps. These plugin-added edges are then included automatically when `createContentGraph` is called, enabling features such as "related posts", "cited-by" graphs, or table-of-contents cross-references.

Example plugin adding a "cites" relationship:

```ts
context.extendContentGraph?.({
  pluginName: "my-plugin",
  outgoing: {
    "post-a": ["post-b", "post-c"], // post-a cites post-b and post-c
  },
});
```

The resulting graph's `outgoing`, `incoming`, and `neighbors` queries will include both core-resolved and plugin-contributed edges.