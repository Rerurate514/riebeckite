# Garden Explorer

Provides a standalone exploration page for a Digital Garden. It combines a searchable note list, tag/folder filters, a Local/Global Graph, and note details.

## Installation

```bash
npm install @riebeckite/plugin-garden-explorer
```

Register it in `riebeckite.config.ts`:

```ts
import { gardenExplorerPlugin } from "@riebeckite/plugin-garden-explorer";

export default defineConfig({
  plugins: [
    gardenExplorerPlugin({
      layout: "force",
      depth: 1,
      showTags: true,
      showFolders: true,
    }),
  ],
});
```

## What it provides

- **Local Graph** — starts from the selected page and shows direct neighbors by default (`depth: 1`).
- **Global Graph** — shows all currently filtered public pages and their internal links.
- **Force layout** — the default interactive layout, with small built-in physics and no heavy dependency.
- **Radial layout** — keeps Riebeckite's existing deterministic radial graph available via `layout: "radial"`.
- **Exploration interactions** — hover highlights connected nodes/edges, unrelated nodes dim, nodes can be dragged, the canvas can be panned/zoomed, and clicking a node opens its page.

The graph uses Riebeckite's Content Graph and public manifest. It does not rescan the vault on the client, and missing, excluded, or unpublished pages are not emitted as nodes.

## Obsidian relationship

The interaction model follows Obsidian/Quartz expectations for a published Digital Garden: local/global graph, depth-limited local exploration, hover neighbor emphasis, click navigation, drag, pan, zoom, tags, folders, backlinks, and outgoing links. It is not a pixel-perfect copy of Obsidian; it preserves Riebeckite permalinks, Page System, l10n-aware manifests, and Plugin API boundaries.

## When to use it

Use it as an entry point for exploring connections across an entire Digital Garden rather than navigating only from individual articles.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For the full option list, public APIs, constraints, and additional examples, see the [package README](../../../packages/plugins/garden-explorer/README.md). For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).
