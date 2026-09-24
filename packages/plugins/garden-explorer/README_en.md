# @riebeckite/plugin-garden-explorer

Interactive note garden explorer: a graph, search box, tag/folder filters, and
note details in a single page.

[日本語](./README_ja.md)

## Overview

`gardenExplorer()` provides an interactive `GardenExplorer` component with three
panels:

- **Explorer** — search box plus tag and folder filter chips (with counts) and
  a filtered note list
- **Graph** — an interactive radial SVG graph of notes and internal links with
  zoom (`+`/`−`/wheel), pan (drag), and reset
- **Details** — the selected note's links, tags, excerpt, and related notes

Selection state is mirrored to the URL query (`?note=`, `?tag=`, `?folder=`),
so the view is shareable and the filter list adapts to the current selection.

`getGardenExplorerData()` builds the note set from published entries, including
headings, a plain-text body (truncated to 4,000 chars), tags, folders, outgoing
links, and backlinks. It reuses the search engine from
`@riebeckite/plugin-search` (via `searchItems`) and the radial layout from
`../src/graph.ts`.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { gardenExplorerPlugin } from "@riebeckite/plugin-garden-explorer";

export default defineConfig({
  // ...
  plugins: [gardenExplorerPlugin()],
});
```

`gardenExplorerPlugin()` registers the plugin in the plugin list and bundles
`style.css` into the app stylesheet.

### Render the component

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
});

// ...in your /explore route
return <GardenExplorer data={data} />;
```

The component is client-side interactive and expects `window` to be available
in the browser.

## Data

`getGardenExplorerData()` returns `GardenExplorerData`:

- `notes` — published notes sorted by title, each a `SearchItem` with `folder`,
  `outgoing`, and `backlinks`
- `edges` — note-to-note graph edges between published notes
- `tags` — tag counts, most frequent first
- `folders` — folder counts, alphabetical; root-level notes are `"Root"`

## Exports

- `gardenExplorerPlugin()` — plugin factory
- `GardenExplorer` — interactive explorer component (default export of
  `components/garden-explorer.tsx`)
- `getGardenExplorerData({ manifest, config, resolveTitle })` — builds the
  explorer dataset
- Types: `GardenExplorerData`, `GardenExplorerEdge`, `GardenExplorerFolder`,
  `GardenExplorerNote`, `GardenExplorerTag`

## See also

- [Plugin guide](../../docs/plugins_en.md)
- [`@riebeckite/plugin-search`](../plugin-search/README_en.md)
- [`@riebeckite/plugin-local-graph`](../plugin-local-graph/README_en.md)