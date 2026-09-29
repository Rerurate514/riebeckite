# @riebeckite/plugin-canvas

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
2. A ` ```canvas ` fence whose body is `![[diagram.canvas]]` or
   `[[diagram.canvas]]`, read through `contentSource`
3. A direct `![[diagram.canvas]]` embed, resolved as an attachment

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
`onManifestCreated` from the manifest, rewriting both `entry.html` and the cached
`PostContent.html`. `text` nodes get minimal Markdown handling (wikilinks and
escaping).

## Client

`initCanvas()` finds elements whose `data-canvas-render` is `client` / `both`,
builds positioned nodes and SVG edges from the payload, then sets
`data-canvas-render="ready"`; CSS hides the static fallback once ready. It also
supports wheel zoom and drag pan (pan/zoom-lite).

## Options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `className` | `"rb-canvas"` | Wrapper class name |
| `language` | `"canvas"` | Code fence language |
| `render` | `"both"` | `"static"`, `"client"`, or `"both"` |
| `height` | unset | Stage height (px number or CSS length) |
| `maxNodes` | unset | Maximum number of nodes drawn |

## Exports

- `canvas(options?)` / `canvasPlugin` — plugin factory
- `initCanvas()` — client initializer
- `parseCanvas(json)` — pure JSON Canvas parser
- `buildCanvasLayout(doc)` — pure coordinate/edge normaliser
- `resolveCanvasOptions(options)` — apply defaults
- Types: `CanvasOptions`, `CanvasRenderMode`, `CanvasDocument`, `CanvasNode`,
  `CanvasEdge`, and more

## See also

- [Plugin guide](../../../docs/en/plugin-system.md)