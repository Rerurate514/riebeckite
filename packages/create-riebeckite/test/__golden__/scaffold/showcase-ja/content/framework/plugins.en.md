---
publish: true
---

# Plugins

Riebeckite's power comes from its plugin ecosystem — over fifty packages that extend Markdown, rendering, search, SEO, and more. Below are representative examples grouped by capability; every entry links to its full README.

## Adding a plugin

Install the package:

```sh
npm install @riebeckite/plugin-mermaid
```

Register it in the `plugins` array of `riebeckite.config.ts`:

```ts
import { defineConfig } from "@riebeckite/core";
import { l10n } from "@riebeckite/plugin-l10n";
import { mermaid } from "@riebeckite/plugin-mermaid";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), l10n({ ... }), mermaid()],
});
```

The complete plugin index lives in the repository:

[Riebeckite plugins on GitHub](https://github.com/Rerurate514/riebeckite/tree/main/packages/plugins)

## Markdown and notes

Everyday note-taking tuned for Obsidian vaults.

| Plugin | What it does |
| --- | --- |
| [`@riebeckite/plugin-obsidian-markdown`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/obsidian-markdown/README.md) | Obsidian-flavored Markdown: wikilinks, embeds, callouts, and tags. |
| [`@riebeckite/plugin-attachment`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/attachment/README.md) | Renders attached files and embeds assets via wikilinks. |
| [`@riebeckite/plugin-media`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/media/README.md) | Audio and video embeds from plain links. |

## Diagrams and presentation

Turn fenced code blocks into diagrams, charts, and slide decks.

| Plugin | What it does |
| --- | --- |
| [`@riebeckite/plugin-mermaid`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/mermaid/README.md) | Mermaid diagrams from fenced code blocks. |
| [`@riebeckite/plugin-graphviz`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/graphviz/README.md) | DOT / Graphviz diagrams. |
| [`@riebeckite/plugin-d2`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/d2/README.md) | Diagrams in the D2 language. |
| [`@riebeckite/plugin-excalidraw`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/excalidraw/README.md) | Renders Excalidraw sketch files. |
| [`@riebeckite/plugin-gallery`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/gallery/README.md) | Card grids for theme or project showcases. |

## Code and reading experience

Better code blocks and a comfortable reading experience.

| Plugin | What it does |
| --- | --- |
| [`@riebeckite/plugin-code-enhance`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-enhance/README.md) | Syntax highlighting, line numbers, and code toolbars. |
| [`@riebeckite/plugin-code-tabs`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-tabs/README.md) | Accessible tabbed code blocks. |
| [`@riebeckite/plugin-toc`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/toc/README.md) | A scroll-aware table of contents. |
| [`@riebeckite/plugin-backlinks`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/backlinks/README.md) | Lists notes that link to the current one. |

## Search and navigation

Find and move through your notes quickly.

| Plugin | What it does |
| --- | --- |
| [`@riebeckite/plugin-search`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/search/README.md) | Client-side full-text search with a Ctrl+K modal. |
| [`@riebeckite/plugin-garden-explorer`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/garden-explorer/README.md) | An interactive graph and search explorer. |
| [`@riebeckite/plugin-local-graph`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/local-graph/README.md) | A link graph around the current note. |
| [`@riebeckite/plugin-permalink`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/permalink/README.md) | Stable, configurable permalinks. |

## Publishing and SEO

Ship a site that search engines and readers both understand.

| Plugin | What it does |
| --- | --- |
| [`@riebeckite/plugin-seo`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/seo/README.md) | SEO metadata, sitemaps, RSS/Atom/JSON feeds, and robots.txt. |
| [`@riebeckite/plugin-l10n`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/l10n/README.md) | Localized URLs, a language switcher, and hreflang metadata — this site runs on it. |
| [`@riebeckite/plugin-rich-embed`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/rich-embed/README.md) | Build-time rich media cards for external links. |
| [`@riebeckite/plugin-deploy`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/deploy/README.md) | Static deployment output for hosting services. |

## Content and developer experience

Query, organize, and keep your content healthy.

| Plugin | What it does |
| --- | --- |
| [`@riebeckite/plugin-dataview`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/dataview/README.md) | Build-time queries over your notes. |
| [`@riebeckite/plugin-kanban`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/kanban/README.md) | Obsidian-style Kanban boards from Markdown lists. |
| [`@riebeckite/plugin-responsive-image`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/responsive-image/README.md) | Responsive images with lazy loading. |
| [`@riebeckite/plugin-quality`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/quality/README.md) | Static quality and accessibility checks. |


Riebeckite: [documentation](https://github.com/Rerurate514/riebeckite/blob/main/docs/README.en.md) · [日本語ドキュメント](https://github.com/Rerurate514/riebeckite/blob/main/docs/README.md)

