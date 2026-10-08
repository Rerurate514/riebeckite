# @riebeckite/plugin-d2

D2 diagram rendering for ` ```d2 ` code blocks.

[日本語](./README_ja.md)

## Overview

`d2()` replaces D2 code blocks with a `<figure class="rb-d2">` that renders to
SVG. Diagrams are rendered at build time by the D2 WebAssembly engine running in
Node, with an automatic client-side fallback. It runs with `order: -10`.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { d2 } from "@riebeckite/plugin-d2";

export default defineConfig({
  // ...
  plugins: [
    d2({
      render: "build",
      theme: { light: 0, dark: 1 },
      layout: "dagre",
    }),
  ],
});
```

## Syntax

````markdown
```d2 title="Request flow"
client -> server: request
server -> database: query
```
````

A caption can also be written as the first line of the block. D2 uses `#` for
comments, so a leading `# caption: ...` line is treated as a caption and removed
before rendering:

````markdown
```d2
# caption: Request flow
client -> server: request
```
````

## Behavior

### Build

- Replaces each ` ```d2 ` `<pre>` with a `figure.rb-d2` containing:
  - `figcaption.rb-d2__caption` — from the code block title or a
    `# caption: ...` line
  - `div.rb-d2__canvas` — the diagram (`role="img"`, labelled by the caption
    when present)
  - `details.rb-d2__fallback` — collapsible diagram source
- Static SVG is rendered at build time when `render` is `"build"`
  by running the D2.js WebAssembly engine (`@d2lang/d2`) directly in Node. No
  browser, network access, or system D2 binary is required.
- The generated figure always carries `data-d2`, `data-d2-source`, and
  `data-d2-layout` attributes. `data-d2` is `rendered` when static SVG is
  present and `pending` when the client must take over.
- Invalid diagrams report `ruleId: "invalid-diagram"`; renderer failures report
  `ruleId: "renderer-error"`. When build SVG is unavailable, the figure remains
  `data-d2="pending"` for client fallback.

### Client (`initD2Diagrams`)

- Loads D2.js as an ESM module from jsDelivr unless `globalThis.d2` or an
  injected module is provided
- Renders every `[data-d2="pending"]` figure; failures set `data-d2="error"`
  (placeholder message via CSS)
- When `theme` is `{ light, dark }`, the theme is chosen from
  `html[data-theme]` or `prefers-color-scheme`

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `render` | `"build" \| "client"` | `"build"` | When diagrams are rendered |
| `theme` | `number \| { light: number; dark: number }` | `{ light: 0, dark: 1 }` | D2 theme id(s) |
| `layout` | `"dagre" \| "elk"` | `"dagre"` | D2 layout engine |
| `caption` | `boolean` | `true` | Show title / `# caption:` as `figcaption` |
| `fallback` | `boolean` | `true` | Show the diagram source in `<details>` |
| `className` | `string` | `"rb-d2"` | Base CSS class for the figure |

`render` modes:

- `"build"` — render SVG at build time; diagrams that fail fall back to client
  rendering
- `"client"` — skip build-time rendering, render in the browser only

## Offline requirements

Build-time rendering is fully offline: `@d2lang/d2` ships a WebAssembly build
that is loaded from `node_modules`. Client rendering (`render: "client"` or a
build failure) downloads D2.js from jsDelivr; point `moduleUrl` at a self-hosted
copy if the deployment has no outbound network access.

## Output hooks

- Set `globalThis.d2` to a preloaded D2.js module to skip the CDN import.
- Pass `api` and `moduleUrl` to `initD2Diagrams()` when calling it directly.

## Exports

- `d2(options?)` — plugin factory (`d2Plugin` is an alias)
- `initD2Diagrams` — client initializer
- Types: `D2Options`, `D2ClientOptions`, `D2RenderMode`, `D2Layout`, `D2Theme`,
  `D2ModuleApi`

## Limitations

- A diagram is rendered per build with a fresh D2 worker; very large batches pay
  the WASM startup cost repeatedly.
- `layout: "elk"` uses D2's ELK engine, which is slower than `dagre`.
- Multi-board and animated D2 output are not configured by this plugin.
- The renderer is `@d2lang/d2` (MPL-2.0), which provides the D2.js WASM build.

## See also

- [Plugin guide](../../../docs/docs/reference/plugin-api.md)
