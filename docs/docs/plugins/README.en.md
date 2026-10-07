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

Each page links to the Plugin reference. Install any Plugin with
`npm install @riebeckite/plugin-<slug>` and register it in `riebeckite.config.ts`.

### Markdown and notes

| Plugin | What it does |
| --- | --- |
| [Obsidian Markdown](./obsidian-markdown.en.md) | WikiLinks, embeds, callouts, and Obsidian-flavored syntax |
| [Shortcodes](./shortcodes.en.md) | Inline, block, and container directives for reusable snippets |
| [Highlight](./highlight.en.md) | Obsidian-style inline highlighting |
| [Alias](./alias.en.md) | Obsidian alias redirects for notes |
| [Properties](./properties.en.md) | Frontmatter property panels |
| [Bases](./bases.en.md) | Build-time Obsidian Bases tables |
| [Citations](./citations.en.md) | BibTeX and BibLaTeX citations |
| [Sidenotes](./sidenotes.en.md) | Tufte-style side notes with mobile popovers |
| [Text Fragment](./text-fragment.en.md) | Text Fragment links and quotes |
| [Diff](./diff.en.md) | Git-backed note diffs and revision history |
| [Daily Notes](./daily-notes.en.md) | Daily Note snippet widgets |
| [Flashcards](./flashcards.en.md) | Interactive flashcard decks from code blocks |
| [Kanban](./kanban.en.md) | Build-time Obsidian Kanban boards |
| [Hover Preview](./hover-preview.en.md) | Popover previews for internal links |

### Diagrams and presentation

| Plugin | What it does |
| --- | --- |
| [Mermaid](./mermaid.en.md) | Mermaid diagrams from code blocks |
| [D2](./d2.en.md) | D2 diagrams from code blocks |
| [Graphviz](./graphviz.en.md) | Graphviz DOT graphs |
| [PlantUML](./plantuml.en.md) | PlantUML diagrams from code blocks |
| [Chart.js](./chartjs.en.md) | Chart.js charts from code blocks |
| [Vega-Lite](./vega-lite.en.md) | Vega-Lite visualizations from code blocks |
| [WaveDrom](./wavedrom.en.md) | WaveDrom timing diagrams |
| [Markmap](./markmap.en.md) | Markdown mind maps with Markmap |
| [Marp](./marp.en.md) | Build-time Marp slide decks |
| [Excalidraw](./excalidraw.en.md) | Excalidraw attachment rendering |
| [ExcaliBrain](./excalibrain.en.md) | Relationship maps for notes |

### Visuals and media

| Plugin | What it does |
| --- | --- |
| [Attachment](./attachment.en.md) | Attachment link and embed rendering |
| [Media](./media.en.md) | Audio and video embeds with timestamp fragments |
| [Responsive Image](./responsive-image.en.md) | Responsive image markup and lazy loading |
| [Gallery](./gallery.en.md) | Markdown-driven card galleries |
| [Lightbox](./lightbox.en.md) | Click-to-zoom image lightboxes |
| [PDF](./pdf.en.md) | Inline PDF attachment viewing |
| [QR Code](./qr-code.en.md) | Inline SVG QR codes from code blocks |
| [Map](./map.en.md) | Interactive and static OpenStreetMap embeds |
| [Rich Embed](./rich-embed.en.md) | Build-time rich media embeds |
| [AutoCardLink](./autocardlink.en.md) | Link preview cards from `cardlink` blocks |

### Code and reading experience

| Plugin | What it does |
| --- | --- |
| [Code Enhance](./code-enhance.en.md) | Enhanced syntax-highlighted code blocks |
| [Code Tabs](./code-tabs.en.md) | Accessible tabbed code blocks |
| [Code Annotations](./code-annotations.en.md) | Code annotations, highlights, and diff markers |
| [Table of Contents](./toc.en.md) | Scroll-aware in-page table of contents |
| [UX](./ux.en.md) | Reading experience enhancements |
| [color-mode](./color-mode.en.md) | Light, dark, and system color-mode switching |

### Search and navigation

| Plugin | What it does |
| --- | --- |
| [Search](./search.en.md) | Client-side full-text search |
| [Navigation](./navigation.en.md) | Site navigation derived from the vault or authored in config |
| [Backlinks](./backlinks.en.md) | Backlink lists for published notes |
| [Breadcrumbs](./breadcrumbs.en.md) | Slug-hierarchy breadcrumb navigation |
| [Local Graph](./local-graph.en.md) | Local note graph visualizations |
| [Garden Explorer](./garden-explorer.en.md) | Interactive graph and search explorer |
| [Recent Posts](./recent-posts.en.md) | Recent posts lists |
| [Related Posts](./related-posts.en.md) | Build-time related-post navigation |
| [Series](./series.en.md) | Ordered multi-part post navigation |
| [Taxonomy](./taxonomy.en.md) | Tag and folder taxonomy, per-term feeds, and SEO |
| [Query](./query.en.md) | Build-time content queries from code blocks |
| [Dataview](./dataview.en.md) | Build-time Dataview queries |
| [Folder Pages](./folder-pages.en.md) | Folder entry pages and generated listings |
| [Archive](./archive.en.md) | Monthly archive listing pages |

### Publishing and SEO

| Plugin | What it does |
| --- | --- |
| [SEO](./seo.en.md) | Metadata, sitemaps, feeds, and robots.txt |
| [Deploy](./deploy.en.md) | Static hosting deployment output |
| [Permalink](./permalink.en.md) | Stable, configurable content permalinks |
| [Rename](./rename.en.md) | Rename and move redirects for published notes |
| [Analytics](./analytics.en.md) | Storage-independent analytics foundation |
| [Changelog](./changelog.en.md) | Git-backed change history and changelogs |
| [Webmention](./webmention.en.md) | Verified Webmention receiving and rendering |
| [Share](./share.en.md) | Per-article share links and copy-to-clipboard |

### Content and developer experience

| Plugin | What it does |
| --- | --- |
| [Localization](./l10n.en.md) | Content localization, localized URLs, and translation metadata |
| [Quality](./quality.en.md) | Static quality and accessibility inspection |
| [Diagnostics](./diagnostics.en.md) | Content diagnostics for Riebeckite and Obsidian vaults |
| [Docs](./docs.en.md) | Docs sidebar and previous/next navigation |
| [Canvas](./canvas.en.md) | Obsidian Canvas diagram rendering |
| [Discord Embed](./discord-embed.en.md) | Discord link preview metadata |

## If you want to build a Plugin

Start with [Writing a Plugin](./writing-a-plugin.en.md). Exact contracts live in [Plugin API](../reference/plugin-api.en.md), and the framework-level page model is described in [Framework / Page system](../framework/page-system.en.md).

## Next

- [Plugin Showcase](./showcase.en.md)
- [Writing a Plugin](./writing-a-plugin.en.md)
