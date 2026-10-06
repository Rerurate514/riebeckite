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
| Use Obsidian WikiLinks and embeds | [Obsidian Markdown](./obsidian-markdown.en.md) |
| Show Mermaid diagrams | [Mermaid](./mermaid.en.md) |
| Add site search | [Search](./search.en.md) |
| Use tags and classification pages | [Taxonomy](./taxonomy.en.md) |
| Show backlinks | [Backlinks](./backlinks.en.md) |
| Enlarge images in an overlay | [Lightbox](./lightbox.en.md) |
| Show Excalidraw drawings | [Excalidraw](./excalidraw.en.md) |
| Show how notes relate to each other | [ExcaliBrain](./excalibrain.en.md) |
| Show Obsidian Canvas files | [Canvas](./canvas.en.md) |
| Use BibTeX citations | [Citations](./citations.en.md) |
| Build a multilingual site | [Localization](./l10n.en.md) |
| Add docs sidebar and previous/next links | [Docs](./docs.en.md) |

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

- [Alias](./alias.en.md)
- [Analytics](./analytics.en.md)
- [Archive](./archive.en.md)
- [Attachment](./attachment.en.md)
- [AutoCardLink](./autocardlink.en.md)
- [Backlinks](./backlinks.en.md)
- [Bases](./bases.en.md)
- [Breadcrumbs](./breadcrumbs.en.md)
- [Canvas](./canvas.en.md)
- [Changelog](./changelog.en.md)
- [Chart.js](./chartjs.en.md)
- [Citations](./citations.en.md)
- [Code Annotations](./code-annotations.en.md)
- [Code Enhance](./code-enhance.en.md)
- [Code Tabs](./code-tabs.en.md)
- [color-mode](./color-mode.en.md)
- [D2](./d2.en.md)
- [Daily Notes](./daily-notes.en.md)
- [Dataview](./dataview.en.md)
- [Deploy](./deploy.en.md)
- [Diagnostics](./diagnostics.en.md)
- [Diff](./diff.en.md)
- [Discord Embed](./discord-embed.en.md)
- [Docs](./docs.en.md)
- [ExcaliBrain](./excalibrain.en.md)
- [Excalidraw](./excalidraw.en.md)
- [Flashcards](./flashcards.en.md)
- [Folder Pages](./folder-pages.en.md)
- [Gallery](./gallery.en.md)
- [Garden Explorer](./garden-explorer.en.md)
- [Graphviz](./graphviz.en.md)
- [Highlight](./highlight.en.md)
- [Hover Preview](./hover-preview.en.md)
- [Kanban](./kanban.en.md)
- [Localization](./l10n.en.md)
- [Lightbox](./lightbox.en.md)
- [Local Graph](./local-graph.en.md)
- [Map](./map.en.md)
- [Markmap](./markmap.en.md)
- [Marp](./marp.en.md)
- [Media](./media.en.md)
- [Mermaid](./mermaid.en.md)
- [Navigation](./navigation.en.md)
- [Obsidian Markdown](./obsidian-markdown.en.md)
- [PDF](./pdf.en.md)
- [Permalink](./permalink.en.md)
- [PlantUML](./plantuml.en.md)
- [Properties](./properties.en.md)
- [QR Code](./qr-code.en.md)
- [Quality](./quality.en.md)
- [Query](./query.en.md)
- [Recent Posts](./recent-posts.en.md)
- [Related Posts](./related-posts.en.md)
- [Rename](./rename.en.md)
- [Responsive Image](./responsive-image.en.md)
- [Rich Embed](./rich-embed.en.md)
- [Search](./search.en.md)
- [SEO](./seo.en.md)
- [Series](./series.en.md)
- [Share](./share.en.md)
- [Shortcodes](./shortcodes.en.md)
- [Sidenotes](./sidenotes.en.md)
- [Taxonomy](./taxonomy.en.md)
- [Table of Contents](./toc.en.md)
- [Text Fragment](./text-fragment.en.md)
- [UX](./ux.en.md)
- [Vega-Lite](./vega-lite.en.md)
- [WaveDrom](./wavedrom.en.md)
- [Webmention](./webmention.en.md)

## If you want to build a Plugin

Start with [Writing a Plugin](./writing-a-plugin.en.md). Exact contracts live in [Plugin API](../reference/plugin-api.en.md), and the framework-level page model is described in [Framework / Page system](../framework/page-system.en.md).

## Next

- [Plugin Showcase](./showcase.en.md)
- [Writing a Plugin](./writing-a-plugin.en.md)
