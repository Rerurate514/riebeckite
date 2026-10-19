# @riebeckite/plugin-canvas

<!-- Generated from docs/docs/plugins/canvas.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Render Obsidian `.canvas` files (JSON Canvas 1.0) as diagrams.

[日本語](./README_ja.md)

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
2. A ` ```canvas ` fence whose body is `![diagram.canvas](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/diagram.canvas.md)` or
   `[diagram.canvas](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/diagram.canvas.md)`, read through `contentSource`
3. A direct `![diagram.canvas](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/diagram.canvas.md)` embed, resolved as an attachment

When a canvas is missing or cannot be parsed, the code block is kept and a
message with `source: "@riebeckite/plugin-canvas"` is reported.

## Output

The plugin emits `div.rb-canvas` with `data-canvas` (the input), `data-canvas-nodes`,
`data-canvas-edges`, and `data-canvas-render` (`static` / `client` / `both`, or
`ready` after hydration). It contains:

- `script[type="application/json"][data-canvas-payload]` — escaped JSON Canvas;
  inert, never executed
- `div.rb-canvas__static` — when `render` is `"static"` or `"both"`: a no-JS
  layered fallback with absolutely positioned node cards and an SVG edge list
- `div.rb-canvas__stage` — when `render` is `"client"` or `"both"`: an empty
  stage filled by `initCanvas()`
- `details.rb-canvas__fallback` — a node/edge list for accessibility and no-JS

`file` nodes resolve through `contentIndex`: notes link to their permalink and
other files link to their attachment URL. Note links are finalised in
`onManifestCreated` from the manifest, rewriting the manifest entry's HTML. Core
synchronizes that HTML with the content the route renders. `text` nodes get
minimal Markdown handling (wikilinks and escaping).

## Client

`initCanvas()` finds elements whose `data-canvas-render` is `client` / `both`,
builds positioned nodes and SVG edges from the payload, then sets
`data-canvas-render="ready"`; CSS hides the static fallback once ready. It also
supports wheel zoom and drag pan (pan/zoom-lite).

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

- `canvas(options?)` / `canvasPlugin` — plugin factory
- `initCanvas()` — client initializer
- `parseCanvas(json)` — pure JSON Canvas parser
- `buildCanvasLayout(doc)` — pure coordinate/edge normaliser
- `resolveCanvasOptions(options)` — apply defaults
- Types: `CanvasOptions`, `CanvasRenderMode`, `CanvasDocument`, `CanvasNode`,
  `CanvasEdge`, and more

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
