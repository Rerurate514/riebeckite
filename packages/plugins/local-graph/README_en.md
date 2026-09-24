# @riebeckite/plugin-local-graph

Local (nearby notes) graph rendering: a compact radial graph of a note's
outgoing links and backlinks.

[日本語](./README_ja.md)

## Overview

`localGraph()` provides a `LocalGraph` component that renders the current note
plus its direct links as an SVG radial graph. `getLocalGraph()` collects the
note's note-type outgoing links and backlinks from the manifest, keeps only
published neighbors, and caps each direction at `MAX_NEIGHBORS_PER_DIRECTION`
(10) notes.

Relations are tagged per node:

- `current` — the selected note (center)
- `outgoing` — linked from the current note
- `backlink` — links to the current note
- `both` — linked in both directions

The component renders nothing when there is no published neighbor.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { localGraphPlugin } from "@riebeckite/plugin-local-graph";

export default defineConfig({
  // ...
  plugins: [localGraphPlugin()],
});
```

`localGraphPlugin()` registers the plugin in the plugin list and bundles
`style.css` into the app stylesheet.

### Render the component

```tsx
import LocalGraph, { getLocalGraph } from "@riebeckite/plugin-local-graph";
import { config } from "../config";
import { content } from "../content";
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
  <Article
    footerContent={graph && <LocalGraph graph={graph} />}
  />
);
```

## Graph layout

Node positions come from `layoutRadialGraph()`: the center node sits at the
middle, neighbors are arranged around it by link count; node radius grows with
the number of links. Edges are computed by `buildGraphEdges()`. The header
links to `/explore?note=<slug>` to open the full explorer.

## Exports

- `localGraphPlugin()` — plugin factory
- `LocalGraph` — SVG graph component (default export of `components/local-graph.tsx`)
- `getLocalGraph({ manifest, config, slug, resolveTitle })` — builds nearby-note
  data for a slug (`null` when the note is absent or unpublished)
- `buildGraphEdges(nodes, visibleSlugs?)` — pure edge builder
- `layoutRadialGraph(nodes, options)` — pure radial layout
- Types: `LocalGraphData`, `LocalGraphNode`

## See also

- [Plugin guide](../../docs/plugins_en.md)
- [`@riebeckite/plugin-backlinks`](../plugin-backlinks/README_en.md)
- [`@riebeckite/plugin-garden-explorer`](../plugin-garden-explorer/README_en.md)