# @riebeckite/plugin-local-graph

<!-- Generated from docs/docs/plugins/local-graph.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Local (nearby notes) graph rendering: a compact radial graph of a note's
outgoing links and backlinks.

[日本語](./README_ja.md)

## Recommended placement

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

`localGraphPlugin()` automatically contributes this component to
`article.footer`. The Site decides where that semantic slot is rendered; the
official Starter renders it after article content.

## Quick Start

```ts
import { defineConfig } from "@riebeckite/core";
import { localGraphPlugin } from "@riebeckite/plugin-local-graph";

export default defineConfig({
  // ...
  plugins: [localGraphPlugin()],
});
```

`localGraphPlugin()` registers the plugin and bundles `style.css` into the app
stylesheet. Render `<ContentSlot slots={bodySlots} name="article.footer" />`
once in the article layout to show automatic output.

## Advanced customization

Set `render: false` to use the public data resolver and component in a
Site-owned location without duplicating the automatic footer. This leaves graph
generation and published-neighbor filtering intact.

```tsx
import LocalGraph, { getLocalGraph } from "@riebeckite/plugin-local-graph";
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
  <aside>{graph && <LocalGraph graph={graph} />}</aside>
);
```

```ts
plugins: [localGraphPlugin({ render: false })];
```

Remove the component to remove manually placed UI.

## Configuration

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `render` | `boolean` | `true` | Append the graph to `article.footer`. Set `false` for manual placement. |

## Graph layout

Node positions come from `layoutRadialGraph()`: the center node sits at the
middle, neighbors are arranged around it by link count; node radius grows with
the number of links. Edges are computed by `buildGraphEdges()`. Node links use
each node's resolved `permalink`; the header opens the full explorer through the
internal selection key `/explore?note=<slug>`.

## Exports

- `localGraphPlugin()` — plugin factory
- `LocalGraph` — SVG graph component (default export of `components/local-graph.tsx`)
- `getLocalGraph({ manifest, config, slug, resolveTitle })` — builds nearby-note
  data for a slug (`null` when the note is absent or unpublished)
- `buildGraphEdges(nodes, visibleSlugs?)` — pure edge builder
- `layoutRadialGraph(nodes, options)` — pure radial layout
- Types: `LocalGraphData`, `LocalGraphNode`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [`@riebeckite/plugin-backlinks`](../backlinks/README.md)
- [`@riebeckite/plugin-garden-explorer`](../garden-explorer/README.md)
