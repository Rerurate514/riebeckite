---
date: 2026-10-06
title: Excalidraw
---
# Excalidraw

Excalidraw drawing rendering for Obsidian wikilinks.

[日本語](./excalidraw.ja.md)

## Overview

`excalidraw()` provides the `renderAttachment` hook that
`@riebeckite/plugin-obsidian-markdown` uses when an embedded wikilink
(`![[drawing.excalidraw]]`) resolves to an Excalidraw file. The plugin emits a
placeholder figure carrying the drawing payload, and the client entry renders
it to SVG.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { excalidraw } from "@riebeckite/plugin-excalidraw";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), excalidraw()],
});
```

The plugin registers `style.css` and a client entry (`initExcalidraw`) that
the app calls on page initialization.

## Supported formats

### `*.excalidraw` — plain JSON scene

A compact Excalidraw export with `elements`, optional `appState`, and
`files`.

### `*.excalidraw.md` — Obsidian Excalidraw drawing

Obsidian "Excalidraw" plugin stores drawings in Markdown. The `## Drawing`
fenced code block is extracted and supports both `json` and lz-string
`compressed-json` variants.

## Behavior

### Build (`renderAttachment`)

- Only handles embedded wikilinks (`![[...]]`) to paths ending in
  `.excalidraw` or `.excalidraw.md`; everything else returns `null` and falls
  through to the attachment plugin
- Reads the file under `config.content.directory` (path-traversal safe)
- Parses the scene before rendering it.
- Wikilink aliases can set a size: `![[drawing.excalidraw|800]]` (width) or
  `![[drawing.excalidraw|800x600]]` (width x height)
- Missing files, invalid scenes, or out-of-directory paths render an error
  placeholder and log to the console

#### Live example

The following source is rendered as an SVG drawing on this page.

````md
![[HW]]
````

![[HW]]

### Client (`initExcalidraw`)

- Renders pending figures to SVG with `exportToSvg` from
  `@excalidraw/excalidraw`
- Figures marked `data-excalidraw-lazy="false"` render immediately; the rest
  render when they scroll into view (`IntersectionObserver`, 200px margin)
- Success → `data-excalidraw="ready"` (the SVG replaces the empty canvas)
- Failure → `data-excalidraw="error"` plus a placeholder message

## Standalone pages

An Excalidraw drawing stored as Markdown is also served as a standalone page
instead of a plain Markdown page. The plugin registers a page type
(`excalidraw-document`) that claims the entry's permalink with a trailing
`.excalidraw` removed.

- Detection: the slug ends in `.excalidraw` (for `*.excalidraw.md`), or the
  frontmatter contains `excalidraw-plugin: parsed`
- `drawing.excalidraw.md` (permalink `/drawing.excalidraw`) is served at
  `/drawing`
- The page body provides its own `<main>` and `<h1>`, and reuses the same
  placeholder figure and `initExcalidraw` client as embedded wikilinks

The page type resolves before normal content routing, so no extra app route is
required. Only public entries are listed.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `lazy` | `boolean` | `true` | Render lazily in the browser (as the figure enters the viewport) instead of immediately |

## Exports

- `excalidraw(options?)` / `excalidraw` — plugin factory
- Type: `ExcalidrawOptions`

## See also

- [Plugin guide](../reference/plugin-api.md)
- [`@riebeckite/plugin-obsidian-markdown`](./obsidian-markdown.md)
- [`@riebeckite/plugin-attachment`](./attachment.md)
