<!-- Generated from packages/plugins/garden-explorer/README.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Garden Explorer

Interactive note garden explorer: a local/global content graph, search box,
tag/folder filters, and note details in a single page.

[日本語](./garden-explorer.md)

## Overview

`gardenExplorerPlugin()` provides an interactive `GardenExplorer` component with
three panels:

- **Explorer** — search box plus optional tag and folder filter chips (with
  counts) and a filtered note list
- **Graph** — an SVG graph of published notes and internal links with local and
  global modes, force or radial layout, hover neighbor emphasis, node drag,
  wheel/button zoom, canvas pan, reset, and click-to-open navigation
- **Details** — the selected note's links, tags, excerpt, and related notes

Selection state is mirrored to the URL query (`?note=`, `?tag=`, `?folder=`),
so the view is shareable and the filter list adapts to the current selection.

`getGardenExplorerData()` builds the note set from `manifest.discoverableEntries`
and `manifest.graph`, including headings, a plain-text body (truncated to 4,000
chars), tags, folders, outgoing links, and backlinks. The graph only contains
published/discoverable notes and resolved note links, so unpublished, excluded,
or missing pages do not appear as graph nodes.

The note list in the Explorer panel shows the first 80 filtered notes for UI
performance. The Global Graph uses all filtered notes. If a URL-selected note
falls outside the first 80, it is preserved in the Global Graph.

## Local and global graph

- **Local graph** starts at the selected note and shows neighbors up to `depth`
  hops. The default is `depth: 1`, matching the common Obsidian/Quartz model of
  direct backlinks and outgoing links. Use `depth: 0` to show only the selected
  note.
- **Global graph** shows all currently filtered public notes and their published
  internal links.

This is intentionally close to Obsidian's exploration model, but it uses
Riebeckite's Page System, public manifest, permalinks, and content graph instead
of rescanning the vault in the browser.

## Layouts

- **Force layout** (`layout: "force"`, default) uses a small deterministic
  built-in simulation: repulsion, link distance, centering, damping, and bounded
  stabilization. It adds no large dependency. With large graphs (>300 nodes) the
  force layout computation becomes noticeable; a warning is shown in the toolbar.
  For large Global Graphs, consider using the radial layout. Above 500 nodes,
  explicit user approval is required before the force layout runs.
- **Radial layout** (`layout: "radial"`) keeps the existing Riebeckite radial
  layout available for compact or deterministic presentations. It runs in
  near-linear time and handles thousands of nodes instantly.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { gardenExplorerPlugin } from "@riebeckite/plugin-garden-explorer";

export default defineConfig({
  // ...
  plugins: [gardenExplorerPlugin()],
});
```

With configuration:

```ts
plugins: [
  gardenExplorerPlugin({
    layout: "force",
    depth: 1,
    showTags: true,
    showFolders: false,
    nodeSize: 1,
    linkDistance: 84,
    repulsion: 1800,
    showLabels: true,
  }),
];
```

`gardenExplorerPlugin()` registers the `/explore` page type and bundles
`style.css` and its client hydrator into the app. A catch-all route using
`resolveRiebeckiteRoute()` and `pluginPageSsgParams()` renders and emits it;
no plugin-specific application route is needed. The page is server-rendered
first, then the registered client entry hydrates its graph, filters, and URL
state after loading.

### Embed the component elsewhere

```tsx
import GardenExplorer, {
  getGardenExplorerData,
} from "@riebeckite/plugin-garden-explorer";
import { config } from "../config";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const data = getGardenExplorerData({
  manifest,
  config,
  resolveTitle: getArticleTitle,
  options: { layout: "radial", depth: 2 },
});

// ...in a site-owned component
return <GardenExplorer data={data} />;
```

The component is client-side interactive and expects `window` to be available in
the browser. The server-rendered fallback still exposes the surrounding
explorer/detail structure and links in semantic lists.

## Data

`getGardenExplorerData()` returns `GardenExplorerData`:

- `notes` — published notes sorted by title, with searchable fields plus
  `folder`, `outgoing`, and `backlinks`
- `edges` — note-to-note graph edges between published notes
- `tags` — tag counts, most frequent first
- `folders` — folder counts, alphabetical; root-level notes are `"Root"`
- `options` — resolved graph options used by the hydrated component

## Exports

- `gardenExplorerPlugin(options?)` — plugin factory
- `GardenExplorer` — interactive explorer component (default export of
  `components/garden-explorer.tsx`)
- `getGardenExplorerData({ manifest, config, resolveTitle, options? })` — builds
  the explorer dataset
- Types: `GardenExplorerData`, `GardenExplorerEdge`, `GardenExplorerFolder`,
  `GardenExplorerGraphLayout`, `GardenExplorerGraphMode`, `GardenExplorerNote`,
  `GardenExplorerOptions`, `GardenExplorerPluginOptions`, `GardenExplorerTag`

## See also

- [Plugin guide](../reference/plugin-api.en.md)
- [`@riebeckite/plugin-local-graph`](./local-graph.en.md)
