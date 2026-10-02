---
title: Plugins
sidebar:
  label: Plugins
  order: 30
  collapsed: true
---
# Plugins

Plugins add features to a Riebeckite site. Use them when you want more than plain Markdown: Obsidian syntax, search, diagrams, media, SEO, discovery widgets, localization, and diagnostics.

## What do you want to do?

| Goal | Plugin |
| --- | --- |
| Use Obsidian WikiLinks and embeds | [Obsidian Markdown](./obsidian-markdown.md) |
| Show Mermaid diagrams | [Mermaid](./mermaid.md) |
| Add site search | [Search](./search.md) |
| Use tags and classification pages | [Taxonomy](./taxonomy.md) |
| Show backlinks | [Backlinks](./backlinks.md) |
| Enlarge images in an overlay | [Lightbox](./lightbox.md) |
| Show Excalidraw drawings | [Excalidraw](./excalidraw.md) |
| Show how notes relate to each other | [ExcaliBrain](./excalibrain.md) |
| Show Obsidian Canvas files | [Canvas](./canvas.md) |
| Use BibTeX citations | [Citations](./citations.md) |
| Build a multilingual site | [Localization](./l10n.md) |
| Add docs sidebar and previous/next links | [Docs](./docs.md) |

This table is an entry point, not the full API reference. For all packages, see the list below.

## Add a Plugin

Install the package:

```bash
npm install @riebeckite/plugin-search
```

Register it in the `plugins` array of `riebeckite.config.ts`:

```ts
import { searchPlugin } from "@riebeckite/plugin-search";

export default defineConfig({
  plugins: [searchPlugin()],
});
```

Each Plugin page shows the package name, import name, and common settings. The package README remains the source of truth for detailed options.

## Official Plugins

- [Alias](./alias.md)
- [Analytics](./analytics.md)
- [Attachment](./attachment.md)
- [Backlinks](./backlinks.md)
- [Bases](./bases.md)
- [Canvas](./canvas.md)
- [Changelog](./changelog.md)
- [Chart.js](./chartjs.md)
- [Citations](./citations.md)
- [Code Enhance](./code-enhance.md)
- [Code Tabs](./code-tabs.md)
- [color-mode](./color-mode.md)
- [D2](./d2.md)
- [Dataview](./dataview.md)
- [Deploy](./deploy.md)
- [Diagnostics](./diagnostics.md)
- [Diff](./diff.md)
- [Docs](./docs.md)
- [ExcaliBrain](./excalibrain.md)
- [Excalidraw](./excalidraw.md)
- [Gallery](./gallery.md)
- [Garden Explorer](./garden-explorer.md)
- [Graphviz](./graphviz.md)
- [Kanban](./kanban.md)
- [Localization](./l10n.md)
- [Lightbox](./lightbox.md)
- [Local Graph](./local-graph.md)
- [Map](./map.md)
- [Markmap](./markmap.md)
- [Marp](./marp.md)
- [Media](./media.md)
- [Mermaid](./mermaid.md)
- [Obsidian Markdown](./obsidian-markdown.md)
- [PDF](./pdf.md)
- [Permalink](./permalink.md)
- [PlantUML](./plantuml.md)
- [Properties](./properties.md)
- [QR Code](./qr-code.md)
- [Quality](./quality.md)
- [Query](./query.md)
- [Recent Posts](./recent-posts.md)
- [Related Posts](./related-posts.md)
- [Responsive Image](./responsive-image.md)
- [Rich Embed](./rich-embed.md)
- [Search](./search.md)
- [SEO](./seo.md)
- [Taxonomy](./taxonomy.md)
- [Table of Contents](./toc.md)
- [Vega-Lite](./vega-lite.md)
- [WaveDrom](./wavedrom.md)

## If you want to build a Plugin

Start with [Writing a Plugin](./writing-a-plugin.md). Exact contracts live in [Plugin API](../reference/plugin-api.md), and the framework-level page model is described in [Framework / Page system](../framework/page-system.md).

## Next

- [Plugin Showcase](./showcase.md)
- [Writing a Plugin](./writing-a-plugin.md)
