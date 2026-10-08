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

Each Plugin page is generated from its package README: `README.md` for English and `README_ja.md` for Japanese. Edit the package README and run `pnpm docs:sync`; do not edit generated Plugin pages directly. The checks verify file pairs, generated output, links, and documented identifiers, but human review is still required for translation quality and semantic accuracy.

## Official Plugins

Each page links to the Plugin reference. Install any Plugin with
`npm install @riebeckite/plugin-<slug>` and register it in `riebeckite.config.ts`.

### Markdown and notes

| Plugin | What it does |
| --- | --- |
| [Obsidian Markdown](./obsidian-markdown.md) | WikiLinks, embeds, callouts, and Obsidian-flavored syntax |
| [Shortcodes](./shortcodes.md) | Inline, block, and container directives for reusable snippets |
| [Highlight](./highlight.md) | Obsidian-style inline highlighting |
| [Alias](./alias.md) | Obsidian alias redirects for notes |
| [Properties](./properties.md) | Frontmatter property panels |
| [Bases](./bases.md) | Build-time Obsidian Bases tables |
| [Citations](./citations.md) | BibTeX and BibLaTeX citations |
| [Sidenotes](./sidenotes.md) | Tufte-style side notes with mobile popovers |
| [Text Fragment](./text-fragment.md) | Text Fragment links and quotes |
| [Diff](./diff.md) | Git-backed note diffs and revision history |
| [Daily Notes](./daily-notes.md) | Daily Note snippet widgets |
| [Flashcards](./flashcards.md) | Interactive flashcard decks from code blocks |
| [Kanban](./kanban.md) | Build-time Obsidian Kanban boards |
| [Hover Preview](./hover-preview.md) | Popover previews for internal links |

### Diagrams and presentation

| Plugin | What it does |
| --- | --- |
| [Mermaid](./mermaid.md) | Mermaid diagrams from code blocks |
| [D2](./d2.md) | D2 diagrams from code blocks |
| [Graphviz](./graphviz.md) | Graphviz DOT graphs |
| [PlantUML](./plantuml.md) | PlantUML diagrams from code blocks |
| [Chart.js](./chartjs.md) | Chart.js charts from code blocks |
| [Vega-Lite](./vega-lite.md) | Vega-Lite visualizations from code blocks |
| [WaveDrom](./wavedrom.md) | WaveDrom timing diagrams |
| [Markmap](./markmap.md) | Markdown mind maps with Markmap |
| [Marp](./marp.md) | Build-time Marp slide decks |
| [Excalidraw](./excalidraw.md) | Excalidraw attachment rendering |
| [ExcaliBrain](./excalibrain.md) | Relationship maps for notes |

### Visuals and media

| Plugin | What it does |
| --- | --- |
| [Attachment](./attachment.md) | Attachment link and embed rendering |
| [Media](./media.md) | Audio and video embeds with timestamp fragments |
| [Responsive Image](./responsive-image.md) | Responsive image markup and lazy loading |
| [Gallery](./gallery.md) | Markdown-driven card galleries |
| [Lightbox](./lightbox.md) | Click-to-zoom image lightboxes |
| [PDF](./pdf.md) | Inline PDF attachment viewing |
| [QR Code](./qr-code.md) | Inline SVG QR codes from code blocks |
| [Map](./map.md) | Interactive and static OpenStreetMap embeds |
| [Rich Embed](./rich-embed.md) | Build-time rich media embeds |
| [AutoCardLink](./autocardlink.md) | Link preview cards from `cardlink` blocks |

### Code and reading experience

| Plugin | What it does |
| --- | --- |
| [Code Enhance](./code-enhance.md) | Enhanced syntax-highlighted code blocks |
| [Code Tabs](./code-tabs.md) | Accessible tabbed code blocks |
| [Code Annotations](./code-annotations.md) | Code annotations, highlights, and diff markers |
| [Table of Contents](./toc.md) | Scroll-aware in-page table of contents |
| [UX](./ux.md) | Reading experience enhancements |
| [color-mode](./color-mode.md) | Light, dark, and system color-mode switching |

### Search and navigation

| Plugin | What it does |
| --- | --- |
| [Search](./search.md) | Client-side full-text search |
| [Navigation](./navigation.md) | Site navigation derived from the vault or authored in config |
| [Backlinks](./backlinks.md) | Backlink lists for published notes |
| [Breadcrumbs](./breadcrumbs.md) | Slug-hierarchy breadcrumb navigation |
| [Local Graph](./local-graph.md) | Local note graph visualizations |
| [Garden Explorer](./garden-explorer.md) | Interactive graph and search explorer |
| [Recent Posts](./recent-posts.md) | Recent posts lists |
| [Related Posts](./related-posts.md) | Build-time related-post navigation |
| [Series](./series.md) | Ordered multi-part post navigation |
| [Taxonomy](./taxonomy.md) | Tag and folder taxonomy, per-term feeds, and SEO |
| [Query](./query.md) | Build-time content queries from code blocks |
| [Dataview](./dataview.md) | Build-time Dataview queries |
| [Folder Pages](./folder-pages.md) | Folder entry pages and generated listings |
| [Archive](./archive.md) | Monthly archive listing pages |

### Publishing and SEO

| Plugin | What it does |
| --- | --- |
| [SEO](./seo.md) | Metadata, sitemaps, feeds, and robots.txt |
| [Deploy](./deploy.md) | Static hosting deployment output |
| [Permalink](./permalink.md) | Stable, configurable content permalinks |
| [Rename](./rename.md) | Rename and move redirects for published notes |
| [Analytics](./analytics.md) | Storage-independent analytics foundation |
| [Changelog](./changelog.md) | Git-backed change history and changelogs |
| [Webmention](./webmention.md) | Verified Webmention receiving and rendering |
| [Share](./share.md) | Per-article share links and copy-to-clipboard |

### Content and developer experience

| Plugin | What it does |
| --- | --- |
| [Localization](./l10n.md) | Content localization, localized URLs, and translation metadata |
| [Quality](./quality.md) | Static quality and accessibility inspection |
| [Diagnostics](./diagnostics.md) | Content diagnostics for Riebeckite and Obsidian vaults |
| [Docs](./docs.md) | Docs sidebar and previous/next navigation |
| [Canvas](./canvas.md) | Obsidian Canvas diagram rendering |
| [Discord Embed](./discord-embed.md) | Discord link preview metadata |

## If you want to build a Plugin

Start with [Writing a Plugin](./writing-a-plugin.md). Exact contracts live in [Plugin API](../reference/plugin-api.md), and the framework-level page model is described in [Framework / Page system](../framework/page-system.md).

## Next

- [Plugin Showcase](./showcase.md)
- [Writing a Plugin](./writing-a-plugin.md)
