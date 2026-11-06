---
date: 2026-10-06
title: Canvas
---
# Canvas

Render Obsidian `.canvas` files (JSON Canvas 1.0) as a read-only, pan-and-zoom viewer.

[日本語](./canvas.ja.md)

## Installation

```sh
npm install @riebeckite/plugin-canvas
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { canvas } from "@riebeckite/plugin-canvas";

export default defineConfig({
  // ...
  plugins: [canvas({ render: "both" })],
});
```

The plugin runs with `order: -15`, after `obsidian-markdown`.

## Accepted inputs

1. A ` ```canvas ` fence whose body is raw JSON Canvas
2. A ` ```canvas ` fence whose body is `![[diagram.canvas]]` or
   `[[diagram.canvas]]`, read through `contentSource`
3. A direct `![[diagram.canvas]]` embed, resolved as an attachment

When a canvas is missing or cannot be parsed, the code block is kept and a
message with `source: "@riebeckite/plugin-canvas"` is reported.

## Live example

~~~canvas
{
  "nodes": [
    { "id": "flow", "type": "group", "x": 0, "y": 0, "width": 820, "height": 420, "label": "Publishing flow", "color": "6" },
    { "id": "idea", "type": "text", "x": 40, "y": 130, "width": 200, "height": 110, "text": "# Capture\n\nAn **idea**", "color": "5" },
    { "id": "plan", "type": "text", "x": 310, "y": 80, "width": 210, "height": 110, "text": "Turn it into a plan", "color": "3" },
    { "id": "logo", "type": "file", "x": 310, "y": 240, "width": 210, "height": 120, "file": "assets/riebeckite-logo.png", "color": "4" },
    { "id": "publish", "type": "link", "x": 590, "y": 150, "width": 180, "height": 100, "url": "https://jsoncanvas.org/spec/1.0/", "label": "JSON Canvas 1.0", "color": "2" }
  ],
  "edges": [
    { "id": "idea-plan", "fromNode": "idea", "fromSide": "right", "toNode": "plan", "toSide": "left", "toEnd": "arrow" },
    { "id": "plan-logo", "fromNode": "plan", "fromSide": "bottom", "toNode": "logo", "toSide": "top", "label": "asset" },
    { "id": "plan-publish", "fromNode": "plan", "fromSide": "right", "toNode": "publish", "toSide": "left", "toEnd": "arrow" }
  ]
}
~~~

## Viewer behaviour

Canvas uses one positioned world for SSR and the interactive viewer. The client
adopts the SSR world, rather than drawing a duplicate, and only hides it after
initialisation succeeds. Text cards support headings, emphasis, inline code,
lists, quotes, and wikilinks. File cards link to notes and preview image, audio,
and video attachments. Groups, preset/hex colors, group backgrounds, edge labels,
JSON Canvas default arrow ends, and JSON array z-order are rendered.

The viewer opens fitted to its frame. Wheel pans; Shift+wheel pans horizontally;
Ctrl/Cmd+wheel zooms at the pointer. Drag blank space with Space or the middle
button to pan. Click and Shift+click select cards, and Shift+drag makes a
selection rectangle. `Ctrl/Cmd+A`, `Shift+1`, and `Shift+2` select all, fit all,
and fit the selection. Touch supports one-finger blank-space pan and two-finger
pinch zoom. Buttons provide zoom, fit, selected-fit, and reset.

The viewer is read-only. External URL cards allow only `http` and `https`; they
are links, never iframe embeds. Mermaid, math, callouts, tables, and note-body
previews are currently unsupported inside cards.

## Output

The plugin emits `div.rb-canvas` with `data-canvas` (the input), `data-canvas-nodes`,
`data-canvas-edges`, and `data-canvas-render` (`static` / `client` / `both`, or
`ready` after hydration). It contains:

- `data-canvas-payload` — an escaped JSON Canvas attribute; it is data, never
  executed
- `div.rb-canvas__static` — a no-JS layered fallback with absolutely positioned
  node cards and an SVG edge list, including when client enhancement is enabled
- `div.rb-canvas__stage` — when `render` is `"client"` or `"both"`: it adopts
  the server-rendered world in `initCanvas()`
- `details.rb-canvas__fallback` — a node/edge list for accessibility and no-JS

`file` nodes resolve through `contentIndex`: notes link to their permalink and
other files link to their attachment URL. Note links are finalised in
`onManifestCreated` from the manifest, rewriting the manifest entry's HTML. Core
synchronizes that HTML with the content the route renders. `text` nodes get
deliberately limited Markdown handling, not the full site Markdown pipeline.
Note-body previews are not emitted: the renderer does not yet receive publication
visibility for the target note, so emitting them could expose private content.

## Client

`initCanvas()` finds elements whose `data-canvas-render` is `client` / `both`,
adopts the server-rendered positioned nodes and SVG edges, then sets
`data-canvas-render="ready"`; CSS hides the static layer only then. It batches
camera transforms with `requestAnimationFrame`; links, text selection, media, and
controls remain interactive.

## Standalone pages

A `.canvas` file referenced by a publicly routable note can also be served as its
own page. This is opt-in and disabled by default:

```ts
canvas({ documentPages: true })
```

- `drawings/Architecture.canvas` → `/drawings/Architecture`
- `diagrams/System.canvas` → `/diagrams/System`

The page type (`canvas-document`) lists the canvases that public entries embed,
drops the `.canvas` extension to build the URL, and reuses the same
`renderCanvas` output and `initCanvas` client as embedded canvases. The page body
provides its own `<main>` and `<h1>`.

Only canvases reachable from a publicly routable entry are published. A canvas
referenced only by a draft, scheduled, or otherwise non-public note is not
published, and note links inside a canvas that point at non-public notes are
neutralized to `#`. When a Markdown page or redirect already owns the same URL,
Markdown wins and the canvas page is skipped with a `canvas-page-conflict`
diagnostic.

Standalone pages declare a `global` output dependency, so adding, renaming,
editing, or deleting a canvas — or changing the notes that reference it —
invalidates the affected outputs.

## Options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `className` | `"rb-canvas"` | Wrapper class name |
| `language` | `"canvas"` | Code fence language |
| `render` | `"both"` | `"static"`, `"client"`, or `"both"` |
| `height` | unset | Stage height (px number or CSS length) |
| `maxNodes` | unset | Maximum number of nodes drawn |
| `documentPages` | `false` | Serve referenced canvases as standalone pages |

## Exports

- `canvas(options?)` / `canvas` — plugin factory
- `initCanvas()` — client initializer
- `parseCanvas(json)` — pure JSON Canvas parser
- `buildCanvasLayout(doc)` — pure coordinate/edge normaliser
- `resolveCanvasOptions(options)` — apply defaults
- Types: `CanvasOptions`, `CanvasRenderMode`, `CanvasDocument`, `CanvasNode`,
  `CanvasEdge`, and more

## See also

- [Plugin guide](../reference/plugin-api.md)
