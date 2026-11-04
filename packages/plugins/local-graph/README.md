# @riebeckite/plugin-local-graph

<!-- Generated from docs/docs/plugins/local-graph.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Interactive local graph of the current note and its neighborhood.

[日本語](./README_ja.md)

## Live example

Open [Backlink](/docs/glossary/backlink) to see the local graph at the bottom of
the article.

## Recommended placement

`localGraph()` provides a `LocalGraph` component that renders the current note
and its surrounding notes with the shared
[`@riebeckite/graph`](https://github.com/Rerurate514/riebeckite/tree/main/packages/graph)
engine. The Site places `<LocalGraph />` itself, normally once after article
content. An isolated note still shows its own node.

The server embeds at most three hops and 320 nodes into the page. The Depth
slider is capped at three for Local Graph, and a notice appears when the
neighborhood was truncated. Use the Explorer for the complete network.

## Quick Start

```ts
import { defineConfig } from "@riebeckite/core";
import { localGraph } from "@riebeckite/plugin-local-graph";

export default defineConfig({
  // ...
  plugins: [localGraph()],
});
```

`localGraph()` registers the plugin, the graph stylesheet, and the client entry
that hydrates the graph after the page loads.

## Interaction

- Wheel or pinch to zoom around the pointer.
- Drag the background to pan and drag a node to pin it while neighbors react.
- Hover a node to highlight its direct connections.
- Click a note to open it. Right-click for open, copy link, new tab, and Explorer
  actions.
- Use `+`/`-` to zoom, arrow keys to pan (`Shift` for faster pan), `n`/`p` to
  move through nodes, `Enter` to open, and `Escape` to clear the selection while
  the graph is focused.
- The Expand button opens the graph full screen.

## Settings

The gear button opens the same Filters, Groups, Display, and Forces sections used
by the Global Graph.

- **Filters** — search, tags, attachments, existing files only, orphans, and
  Local Graph depth.
- **Search** supports `file:`, `path:`, `tag:`, quoted phrases, and `-` negation.
  Unsupported operators are reported instead of silently matching everything.
- **Groups** — ordered color rules. The first matching group wins.
- **Display** — arrows, text fade threshold, node size, link thickness, and
  animation. Animation uses frontmatter dates when available; undated notes are
  revealed in stable order and no dates are invented.
- **Forces** — center, repel, link force, and link distance update the running
  simulation immediately. Restore defaults resets the graph.

Settings are stored in `localStorage` under
`riebeckite-local-graph-settings` and restored on the next visit.

## Data and public boundary

`getLocalGraph()` uses `PublicContentView` and `manifest.discoverableEntries`.
Only public notes become note nodes. Resolved links to private or draft notes are
dropped by the public view, so browser data does not reveal their existence.
Unresolved links, attachments, and tags come from the public manifest and are
shown only when the corresponding filter is enabled.

## Advanced customization

Resolve the graph from the public view with the data helper, or from a manifest with `buildLocalGraph`:

```tsx
import { LocalGraph, buildLocalGraph } from "@riebeckite/plugin-local-graph";
import { content } from "virtual:riebeckite/content";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const graph = buildLocalGraph({
  manifest,
  config,
  slug,
  resolveTitle: getArticleTitle,
});

return <aside>{graph ? <LocalGraph graph={graph} /> : null}</aside>;
```

## Exports

- `localGraph()` — plugin factory
- `LocalGraph` — server component with embedded graph data
- `LocalGraphView` — presentational client component used by hydration
- `getLocalGraph({ view, slug })` — public graph data from the Site's public view
  (`null` when the note is absent or unpublished)
- `buildLocalGraph({ manifest, config, slug, resolveTitle })` — manifest-based
  graph data
- Types: `LocalGraphData`, `LocalGraphNode`, `LocalGraphViewProps`
- Legacy exports `buildGraphEdges()` and `layoutRadialGraph()` remain available
  from `@riebeckite/core/client`; the Local Graph UI no longer uses a fixed
  radial layout.

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [`@riebeckite/plugin-backlinks`](../backlinks/README.md)
- [`@riebeckite/plugin-garden-explorer`](../garden-explorer/README.md)
