# @riebeckite/graph

Shared graph engine for Riebeckite's Local Graph and Garden Explorer.

[日本語](./README_ja.md)

## What it provides

`@riebeckite/graph` turns the public content manifest into a graph document and
renders it with a Canvas 2D force simulation and Obsidian-style controls. The
same engine powers both the article Local Graph and the Global Graph, so
physics, camera, filters, groups, persistence, and lifecycle behavior are not
duplicated between plugins.

- Server-safe data building from public entries, unresolved links, public
  attachments, and tags
- Obsidian-compatible subset of graph search: `file:`, `path:`, `tag:`, quoted
  phrases, and `-` negation
- Filters for tags, attachments, unresolved files, and orphans
- Ordered color groups with first-match priority
- Continuous center, repel, link, and link-distance forces with deterministic
  initial placement and automatic settling
- Canvas renderer with wheel/pinch zoom at the pointer, background pan, node
  drag, hover emphasis, labels that fade by zoom, arrows, groups, animation, and
  pointer/keyboard/context-menu interaction
- Settings persistence through `localStorage`
- Pause when off-screen or when the document is hidden, plus cleanup for SPA
  page transitions

## Usage

```ts
import {
  buildGraphDocument,
  buildVisibleGraph,
  DEFAULT_GRAPH_SETTINGS,
} from "@riebeckite/graph";
import { createGraphRenderer } from "@riebeckite/graph/client";
```

Build a document from public entries:

```ts
const document = buildGraphDocument(
  entries.map((entry) => ({
    slug: entry.slug,
    title: entry.title,
    permalink: entry.permalink,
    tags: entry.tags,
    links: entry.links,
    assets: entry.assets,
    date: entry.date ?? null,
  })),
  { centerSlug: entry.slug },
);
```

Mount the renderer in a browser-only effect:

```ts
const renderer = createGraphRenderer({
  canvas,
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
});

renderer.update({
  document,
  settings: DEFAULT_GRAPH_SETTINGS,
  mode: "global",
});

return () => renderer.destroy();
```

For a ready-made UI, use the shared component:

```tsx
import GraphView from "@riebeckite/graph/ui";
import "@riebeckite/graph/style.css";

<GraphView
  document={document}
  mode="local"
  centerId={entry.slug}
  initialSettings={{ depth: 1 }}
  maxDepth={3}
  expandable
  storageKey="example-graph-settings"
/>;
```

`GraphView` is safe to server-render. It creates the renderer and reads
`localStorage` only in effects, so it can be hydrated by the client lifecycle
used by Riebeckite plugins.

## Settings

Defaults follow Obsidian's graph view where the public data model allows it:

| Setting | Default | Range |
| --- | --- | --- |
| Depth | 2 | 0–5 |
| Tags | on | — |
| Attachments | on | — |
| Existing files only | off | — |
| Orphans | on | — |
| Arrows | off | — |
| Text fade threshold | 0.35 | 0–1 |
| Node size | 1 | 0.5–2.5 |
| Link thickness | 1 | 0.25–3 |
| Center force | 0.35 | 0–1 |
| Repel force | 600 | 0–2000 |
| Link force | 0.7 | 0–1 |
| Link distance | 100 | 30–500 |

`normalizeGraphSettings()` clamps stored values and rejects malformed groups.
`restore defaults` on the settings panel returns to these values while keeping
the mode-specific depth cap.

## Public boundary

Build graph input from `manifest.discoverableEntries` or
`PublicContentView.discoverableEntries`. Never pass private, draft, scheduled,
or unlisted entries to the browser. Resolved links to non-public notes are
removed by `PublicContentView`; unresolved links preserve only the text that is
already in the public note. `buildGraphDocument` also drops note links whose
target is not present in the supplied entries.

## Performance

The simulation uses exact pair repulsion for small graphs and a Barnes-Hut-style
quadtree above 250 nodes. The renderer draws with Canvas 2D, uses a device-pixel
ratio cap of 2, skips off-screen edges and nodes, limits labels on dense graphs,
and stops requesting animation frames once the simulation settles.

`pnpm --filter @riebeckite/graph benchmark` runs synthetic 100 / 675 / 1,000 /
3,000 node graphs with low and high edge density. On the development machine,
settling 3,000 nodes with about 3,600 links takes roughly 1.15 seconds of
simulation work and about 3.8 ms per tick. In the browser, average frame time
stays within a 60 Hz frame at that size, though dense 3,000-node graphs with
about 11,900 links exceed it on some frames (about 12.4 ms average and 24 ms at
the 95th percentile). These numbers are machine dependent.

`d3-force` was evaluated as the default engine. The custom simulation was kept
because it gives deterministic initial placement, explicit pin/release and
reheat control for dragging, and a small dependency-free surface that is shared
by both plugins. Its Barnes-Hut-style quadtree provides the same asymptotic
repulsion behavior without adding a runtime dependency. It is not a drop-in
replacement for every `d3-force` behavior.

## Exports

- `buildGraphDocument(entries, options)`
- `sliceGraphDocument(document, centerId, depth, maxNodes)`
- `buildVisibleGraph({ document, settings, mode, centerId })`
- `collectLocalNodeIds(adjacency, centerId, depth)`
- `parseGraphQuery`, `matchesGraphQuery`, `normalizeGraphText`
- `createGraphSimulation`, `buildRevealSchedule`, `hasDatedNodes`
- `DEFAULT_GRAPH_SETTINGS`, `GRAPH_SETTINGS_RANGES`, `mergeGraphSettings`,
  `normalizeGraphSettings`, `readStoredGraphSettings`,
  `writeStoredGraphSettings`
- `@riebeckite/graph/client`: `createGraphRenderer`
- `@riebeckite/graph/ui`: default `GraphView`
- Types: `GraphDocument`, `GraphNode`, `GraphLink`, `GraphSettings`,
  `GraphGroup`, `GraphMode`, `VisibleGraph`, `VisibleGraphNode`,
  `GraphRenderer`, `GraphViewProps`

## Development

```sh
pnpm --filter @riebeckite/graph test
pnpm --filter @riebeckite/graph benchmark
pnpm --filter @riebeckite/graph build
```
