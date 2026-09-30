# Plugins

Plugins are how you add capabilities to a Riebeckite site: Markdown and Obsidian syntax, diagrams, search, SEO, media, and more. This page helps you find a plugin and explains how to add one. Each plugin's install steps, options, and API live in its package README (linked below).

- Want to see plugins running? Go to the [Plugin Showcase](./showcase.md).
- Want to write your own? Go to [Writing a plugin](./writing-a-plugin.md).
- Need the plugin contract itself? See the [Plugin API](../reference/plugin-api.md) and the [Plugin System](../framework/plugin-system.md).

## Add a plugin to a site

1. Install the package:

   ```sh
   npm install @riebeckite/plugin-search
   ```

   Many presets already include common plugins; check your generated `package.json` first.

2. Import its factory and add it to the `plugins` array in `riebeckite.config.ts`:

   ```ts
   import { searchPlugin } from "@riebeckite/plugin-search";

   export default defineConfig({
     plugins: [searchPlugin()],
   });
   ```

3. Run `npm exec riebeckite check` and `npm exec riebeckite doctor`.

Each package exports its own typed factory and options; the exact names are in the package README. Plugins can be disabled by passing `false`, `null`, or `undefined`, which is useful for conditional registration:

```ts
plugins: [process.env.NODE_ENV === "production" && qualityPlugin()],
```

## Catalog

### Obsidian and Markdown syntax

| Plugin | What it does |
| --- | --- |
| [`obsidian-markdown`](../../../packages/plugins/obsidian-markdown/README.md) | Obsidian-flavored Markdown, including WikiLinks |
| [`properties`](../../../packages/plugins/properties/README.md) | Obsidian-style frontmatter property panels |
| [`alias`](../../../packages/plugins/alias/README.md) | Obsidian alias redirects |
| [`highlight`](../../../packages/plugins/highlight/README.md) | Obsidian-style inline highlighting |
| [`shortcodes`](../../../packages/plugins/shortcodes/README.md) | Remark directive shortcodes |
| [`permalink`](../../../packages/plugins/permalink/README.md) | Stable, configurable permalinks |
| [`sidenotes`](../../../packages/plugins/sidenotes/README.md) | Tufte-style side notes from footnotes |
| [`text-fragment`](../../../packages/plugins/text-fragment/README.md) | Text Fragment links and quotes |

### Diagrams and charts

| Plugin | What it does |
| --- | --- |
| [`mermaid`](../../../packages/plugins/mermaid/README.md) | Mermaid diagrams |
| [`graphviz`](../../../packages/plugins/graphviz/README.md) | Graphviz DOT diagrams |
| [`d2`](../../../packages/plugins/d2/README.md) | D2 diagrams |
| [`plantuml`](../../../packages/plugins/plantuml/README.md) | PlantUML diagrams |
| [`chartjs`](../../../packages/plugins/chartjs/README.md) | Chart.js charts |
| [`vega-lite`](../../../packages/plugins/vega-lite/README.md) | Vega-Lite charts |
| [`wavedrom`](../../../packages/plugins/wavedrom/README.md) | WaveDrom timing diagrams |
| [`markmap`](../../../packages/plugins/markmap/README.md) | Markdown mindmaps |
| [`marp`](../../../packages/plugins/marp/README.md) | Marp slide decks |
| [`qr-code`](../../../packages/plugins/qr-code/README.md) | Inline SVG QR codes |
| [`map`](../../../packages/plugins/map/README.md) | OpenStreetMap embeds |

### Obsidian canvases and knowledge tools

| Plugin | What it does |
| --- | --- |
| [`excalidraw`](../../../packages/plugins/excalidraw/README.md) | Excalidraw attachment rendering |
| [`excalibrain`](../../../packages/plugins/excalibrain/README.md) | ExcaliBrain-style relationship maps |
| [`canvas`](../../../packages/plugins/canvas/README.md) | Obsidian Canvas diagrams |
| [`bases`](../../../packages/plugins/bases/README.md) | Obsidian Bases definitions |
| [`dataview`](../../../packages/plugins/dataview/README.md) | Build-time Dataview queries |
| [`kanban`](../../../packages/plugins/kanban/README.md) | Obsidian Kanban boards |
| [`flashcards`](../../../packages/plugins/flashcards/README.md) | Interactive flashcard decks |

### Content relationships

| Plugin | What it does |
| --- | --- |
| [`backlinks`](../../../packages/plugins/backlinks/README.md) | Backlink lists |
| [`related-posts`](../../../packages/plugins/related-posts/README.md) | Build-time related-post navigation |
| [`recent-posts`](../../../packages/plugins/recent-posts/README.md) | Recent-post lists |
| [`series`](../../../packages/plugins/series/README.md) | Ordered multi-part navigation |
| [`taxonomy`](../../../packages/plugins/taxonomy/README.md) | Tags and folders, per-term feeds |
| [`breadcrumbs`](../../../packages/plugins/breadcrumbs/README.md) | Slug-hierarchy breadcrumbs |
| [`local-graph`](../../../packages/plugins/local-graph/README.md) | Local note graph visualizations |
| [`garden-explorer`](../../../packages/plugins/garden-explorer/README.md) | Graph and search explorer |
| [`hover-preview`](../../../packages/plugins/hover-preview/README.md) | Popover previews for internal links |
| [`toc`](../../../packages/plugins/toc/README.md) | Scroll-aware table of contents |
| [`query`](../../../packages/plugins/query/README.md) | Build-time content queries |
| [`diff`](../../../packages/plugins/diff/README.md) | Git-backed note diffs |
| [`changelog`](../../../packages/plugins/changelog/README.md) | Git-backed change history |
| [`rename`](../../../packages/plugins/rename/README.md) | Rename and move redirects |

### Media and attachments

| Plugin | What it does |
| --- | --- |
| [`attachment`](../../../packages/plugins/attachment/README.md) | Attachment link and embed rendering |
| [`media`](../../../packages/plugins/media/README.md) | Audio and video embeds |
| [`pdf`](../../../packages/plugins/pdf/README.md) | Inline PDF viewing |
| [`responsive-image`](../../../packages/plugins/responsive-image/README.md) | Responsive image markup and lazy loading |
| [`lightbox`](../../../packages/plugins/lightbox/README.md) | Click-to-zoom image lightboxes |
| [`gallery`](../../../packages/plugins/gallery/README.md) | Markdown-driven card galleries |
| [`rich-embed`](../../../packages/plugins/rich-embed/README.md) | Rich media embeds (YouTube, Vimeo, Spotify) |
| [`autocardlink`](../../../packages/plugins/autocardlink/README.md) | Link preview cards |
| [`discord-embed`](../../../packages/plugins/discord-embed/README.md) | Discord link preview metadata |

### Discovery and SEO

| Plugin | What it does |
| --- | --- |
| [`search`](../../../packages/plugins/search/README.md) | Client-side full-text search |
| [`seo`](../../../packages/plugins/seo/README.md) | Metadata, sitemaps, feeds, `robots.txt` |
| [`webmention`](../../../packages/plugins/webmention/README.md) | Receive and render Webmentions |
| [`share`](../../../packages/plugins/share/README.md) | Per-article share links |

### Reading experience

| Plugin | What it does |
| --- | --- |
| [`code-enhance`](../../../packages/plugins/code-enhance/README.md) | Enhanced syntax-highlighted code blocks |
| [`code-tabs`](../../../packages/plugins/code-tabs/README.md) | Accessible tabbed code blocks |
| [`code-annotations`](../../../packages/plugins/code-annotations/README.md) | Annotations, highlights, and diff markers |
| [`ux`](../../../packages/plugins/ux/README.md) | Reading enhancements (progress, back-to-top) |
| [`color-mode`](../../../packages/plugins/color-mode/README.md) | Light / dark / system switching |

### Other

| Plugin | What it does |
| --- | --- |
| [`l10n`](../../../packages/plugins/l10n/README.md) | Content localization and localized URLs |
| [`analytics`](../../../packages/plugins/analytics/README.md) | Storage-independent page-view tracking |
| [`daily-notes`](../../../packages/plugins/daily-notes/README.md) | Daily Note snippet widgets |
| [`deploy`](../../../packages/plugins/deploy/README.md) | Static hosting deployment output |
| [`diagnostics`](../../../packages/plugins/diagnostics/README.md) | Content diagnostics for sites and vaults |
| [`quality`](../../../packages/plugins/quality/README.md) | Static quality and accessibility inspection |

## Which plugin do I need?

| I want to… | Plugin |
| --- | --- |
| Write Obsidian WikiLinks and callouts | `obsidian-markdown` |
| Add Mermaid diagrams | `mermaid` |
| Add search to my site | `search` |
| Show related or backlinked notes | `related-posts`, `backlinks` |
| Publish a multilingual site | `l10n` |
| Add RSS / Atom feeds and a sitemap | `seo` |
| Embed images with zoom | `lightbox`, `responsive-image` |
| Query notes by frontmatter | `dataview`, `query`, `bases` |
| Show git history per note | `changelog`, `diff` |

For the full option list and current behavior, always check the package README.

## See also

- [Plugin Showcase](./showcase.md) — live examples across the catalog
- [Writing a plugin](./writing-a-plugin.md) — build your own
- [Plugin API](../reference/plugin-api.md) — the contract behind every plugin
- [Framework / Plugin system](../framework/plugin-system.md) — how resolution and lifecycle work


