# @riebeckite/plugin-excalidraw

Excalidraw drawing rendering for Obsidian wikilinks.

[日本語](./README_ja.md)

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
- Parses the scene and emits

  ```html
  <figure class="rr-excalidraw" data-excalidraw="pending" data-excalidraw-lazy="true">
    <div class="rr-excalidraw__canvas" role="img" aria-label="drawing.excalidraw"></div>
    <script type="application/json" class="rr-excalidraw__payload">{"elements":[...],"appState":{...},"files":{...}}</script>
  </figure>
  ```

- Wikilink aliases can set a size: `![[drawing.excalidraw|800]]` (width) or
  `![[drawing.excalidraw|800x600]]` (width x height)
- Missing files, invalid scenes, or out-of-directory paths render an error
  placeholder and log to the console

### Client (`initExcalidraw`)

- Renders pending figures to SVG with `exportToSvg` from
  `@excalidraw/excalidraw`
- Figures marked `data-excalidraw-lazy="false"` render immediately; the rest
  render when they scroll into view (`IntersectionObserver`, 200px margin)
- Success → `data-excalidraw="ready"` (the SVG replaces the empty canvas)
- Failure → `data-excalidraw="error"` plus a placeholder message

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `lazy` | `boolean` | `true` | Render lazily in the browser (as the figure enters the viewport) instead of immediately |

## Exports

- `excalidraw(options?)` / `excalidrawPlugin` — plugin factory
- Type: `ExcalidrawOptions`

## See also

- [Plugin guide](../../docs/plugins_en.md)
- [`@riebeckite/plugin-obsidian-markdown`](../plugin-obsidian-markdown/README_en.md)
- [`@riebeckite/plugin-attachment`](../plugin-attachment/README_en.md)