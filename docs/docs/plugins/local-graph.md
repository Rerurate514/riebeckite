---
date: 2026-10-06
title: Local Graph
---
# Local Graph

Local (nearby notes) graph rendering: a compact radial graph of a note's
outgoing links and backlinks.

[日本語](./local-graph.ja.md)

## Live example

Open [Backlink](/docs/glossary/backlink) to see the local graph at the bottom of the article, centered on that page and its neighbors.

## Recommended placement

`localGraph()` provides a `LocalGraph` component that renders the current note
plus its direct links as an SVG radial graph. `getLocalGraph()` collects the
note's outgoing links and backlinks from the manifest, keeps only published
neighbors, and caps each direction at `MAX_NEIGHBORS_PER_DIRECTION` (10) notes.

The Site places the `<LocalGraph />` component itself, normally once after
article content. The component renders nothing when there is no published
neighbor.

## Quick Start

```ts
import { defineConfig } from "@riebeckite/core";
import { localGraph } from "@riebeckite/plugin-local-graph";

export default defineConfig({
  // ...
  plugins: [localGraph()],
});
```

`localGraph()` registers the plugin and bundles `style.css` into the app
stylesheet. The Site renders `<LocalGraph />` component itself, normally once
after article content, to display the graph output.

## Advanced customization

Resolve the graph with the public data helper and pass it to the component:

```tsx
import { LocalGraph, getLocalGraph } from "@riebeckite/plugin-local-graph";
import { content } from "virtual:riebeckite/content";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const graph = getLocalGraph({
  manifest,
  config,
  slug,
  resolveTitle: getArticleTitle,
});

// ...in your route
return (
  <aside>{graph ? <LocalGraph graph={graph} /> : null}</aside>
);
```

Render the component once per article. Remove the element to remove the UI.

## Configuration

There are no plugin options for `localGraph`. The `LocalGraph` component
accepts `graph` as a required prop.

## Graph layout

Node positions come from `layoutRadialGraph()`: the center node sits at the
middle, neighbors are arranged around it by link count; node radius grows with
the number of links. Edges are computed by `buildGraphEdges()`. Node links use
each node's resolved `permalink`; the header opens the full explorer through the
internal selection key `/explore?note=<slug>`.

## Exports

- `localGraph()` — plugin factory
- `LocalGraph` — SVG graph component (default export of `components/local-graph.tsx`)
- `getLocalGraph({ manifest, config, slug, resolveTitle })` — builds nearby-note
  data for a slug (`null` when the note is absent or unpublished)
- `buildGraphEdges(nodes, visibleSlugs?)` — pure edge builder
- `layoutRadialGraph(nodes, options)` — pure radial layout
- Types: `LocalGraphData`, `LocalGraphNode`

## See also

- [Plugin guide](../reference/plugin-api.md)
- [`@riebeckite/plugin-backlinks`](./backlinks.md)
- [`@riebeckite/plugin-garden-explorer`](./garden-explorer.md)
