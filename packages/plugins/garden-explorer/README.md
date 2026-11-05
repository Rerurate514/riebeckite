# @riebeckite/plugin-garden-explorer

<!-- Generated from docs/docs/plugins/garden-explorer.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Interactive note garden explorer: a local/global content graph, search box,
tag/folder filters, and note details in a single page.

[日本語](./README_ja.md)

## Overview

`gardenExplorer()` provides an interactive `GardenExplorer` component with
three panels:

- **Explorer** — search box plus optional tag and folder filter chips (with
  counts) and a filtered note list
- **Graph** — a Canvas force-directed graph of published notes with local and
  global modes, hover emphasis, node drag, wheel/pinch zoom, pan, and
  click-to-open navigation
- **Details** — the selected note's links, tags, excerpt, and related notes

Selection state is mirrored to the URL query (`?note=`, `?tag=`, `?folder=`),
so the view is shareable and the filter list adapts to the current selection.

## Local and global graph

- **Local graph** starts at the selected note and expands through outgoing and
  incoming links up to the Depth setting. Depth 0 shows only the selected note.
- **Global graph** shows all currently filtered public notes.

Both modes use the same `@riebeckite/graph` engine. The graph is a continuous
force simulation, not a fixed layout. A Barnes-Hut-style quadtree keeps
repulsion practical for thousands of nodes, the simulation settles and stops
requesting animation frames, and dragging or changing a force reheats it.

## Graph settings

The gear button in the graph opens Filters, Groups, Display, and Forces.

- **Filters** — search, tags, attachments, existing files only, orphans, depth.
  Search supports `file:`, `path:`, `tag:`, quoted phrases, and `-` negation.
  Unsupported operators are reported.
- **Groups** — ordered color rules, first match wins. Groups can be added,
  removed, and reordered.
- **Display** — arrows, text fade threshold, node size, link thickness, and
  animation. Animation uses real frontmatter dates and never fabricates them.
- **Forces** — center, repel, link force, and link distance update immediately;
  Restore default settings resets the graph.

Settings are stored in `localStorage` under
`riebeckite-garden-graph-settings`. The Explorer search box remains synchronized
with the graph search.

## Interaction

Wheel or pinch zooms around the pointer. Dragging the background pans, dragging
a node pins it while neighbors react. Hovering highlights direct connections.
Clicking a note opens it. Right-click offers open, copy link, new tab, local
graph, and filter actions depending on the node type.

While the canvas has focus, `+`/`-` zoom, arrow keys pan (`Shift` for faster),
`n`/`p` cycle nodes, `Enter` opens, and `Escape` clears the selection.

## Public data

`getGardenExplorerData()` builds notes and graph data from
`manifest.discoverableEntries`, so unlisted, private, draft, and scheduled notes
do not appear. Headings, plain-text bodies (truncated to 4,000 characters),
tags, folders, outgoing links, and backlinks come from the public manifest. The
graph adds unresolved links, public attachments, and tags when the
corresponding filters are enabled. Links to non-public notes are dropped by the
public view and do not reveal that the target exists.

The note list shows the first 80 filtered notes for UI performance. The Global
Graph uses all filtered notes.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { gardenExplorer } from "@riebeckite/plugin-garden-explorer";

export default defineConfig({
  // ...
  plugins: [gardenExplorer()],
});
```

With configuration:

```ts
plugins: [
  gardenExplorer({
    depth: 1,
    showTags: true,
    showFolders: false,
    nodeSize: 1,
    linkDistance: 100,
    repulsion: 600,
  }),
];
```

The legacy `layout` and `showLabels` options are still accepted for
compatibility. The graph always uses the continuous force engine, and labels
fade with zoom via the Display setting instead of a fixed on/off layout.

`gardenExplorer()` registers the `/explore` page type and bundles `style.css`
and its client hydrator. A catch-all route using `resolveRiebeckiteRoute()` and
`pluginPageSsgParams()` renders and emits it; no plugin-specific application
route is needed. The page is server-rendered first, then hydrated after loading.

### Embed the component elsewhere

```tsx
import GardenExplorer, {
  getGardenExplorerData,
} from "@riebeckite/plugin-garden-explorer";

const data = getGardenExplorerData({
  manifest,
  config,
  resolveTitle: getArticleTitle,
  options: { depth: 2 },
});

return <GardenExplorer data={data} />;
```

## Data

`getGardenExplorerData()` returns `GardenExplorerData`:

- `notes` — published notes sorted by title, with searchable fields plus
  `folder`, `outgoing`, and `backlinks`
- `edges` — note-to-note graph edges between published notes
- `graph` — the shared graph document used by the Canvas engine
- `tags` — tag counts, most frequent first
- `folders` — folder counts, alphabetical; root-level notes are `"Root"`
- `options` — resolved graph options used by the hydrated component

## Exports

- `gardenExplorer(options?)` — plugin factory
- `GardenExplorer` — interactive explorer component
- `getGardenExplorerData({ manifest, config, resolveTitle, options? })` — builds
  the explorer dataset
- Types: `GardenExplorerData`, `GardenExplorerEdge`, `GardenExplorerFolder`,
  `GardenExplorerNote`, `GardenExplorerOptions`, `GardenExplorerPluginOptions`,
  `GardenExplorerTag`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [`@riebeckite/plugin-local-graph`](../local-graph/README.md)
