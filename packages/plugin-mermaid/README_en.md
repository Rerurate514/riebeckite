# @riebeckite/plugin-mermaid

Mermaid diagram rendering for ` ```mermaid ` code blocks.

[日本語](./README_ja.md)

## Overview

`mermaid()` replaces mermaid code blocks with a `<figure class="rr-mermaid">`
that renders to SVG. Diagrams are rendered at build time with a headless browser by
default, with an automatic client-side fallback. It runs with `order: -10`.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { mermaid } from "@riebeckite/plugin-mermaid";

export default defineConfig({
  // ...
  plugins: [
    mermaid({
      render: "build",
      theme: { light: "default", dark: "dark" },
    }),
  ],
});
```

## Behavior

### Build

- Replaces each ` ```mermaid ` `<pre>` with a `figure.rr-mermaid` containing:
  - `figcaption.rr-mermaid__caption` — from the code block title or a
    `%% caption: ...` line in the source
  - `div.rr-mermaid__canvas` — the diagram (`role="img"`, labelled by the
    caption when present)
  - `details.rr-mermaid__fallback` — collapsible diagram source
- Static SVG is rendered at build time when `render` is `"build"` or
  `"both"` by running the Mermaid browser API in Puppeteer's headless Chromium.
  Rendering uses Chromium's layout engine, not JSDOM polyfills or custom
  `getBBox` / text-width estimation
- Mermaid runs with `securityLevel: "strict"`, the selected theme, transparent
  background, and a unique SVG id per diagram
- Invalid diagrams report `ruleId: "invalid-diagram"`; Chromium renderer
  failures report `ruleId: "renderer-error"`. When build SVG is unavailable,
  the figure remains `data-mermaid="pending"` for client fallback

### Client (`initMermaidDiagrams`)

- Loads Mermaid from the CDN (jsDelivr, Mermaid 11) unless `globalThis.mermaid`
  or an injected instance is provided
- Renders every `[data-mermaid="pending"]` figure; failures set
  `data-mermaid="error"` (placeholder message via CSS)
- When `theme` is `{ light, dark }`, the theme is chosen from
  `html[data-theme]` or `prefers-color-scheme`

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `render` | `"build" \| "client" \| "both"` | `"build"` | When diagrams are rendered |
| `theme` | `string \| { light: string; dark: string }` | `{ light: "default", dark: "dark" }` | Mermaid theme |
| `caption` | `boolean` | `true` | Show title / `%% caption:` as `figcaption` |
| `fallback` | `boolean` | `true` | Show the diagram source in `<details>` |

`render` modes:

- `"build"` — render SVG at build time; diagrams that fail fall back to client
  rendering
- `"client"` — skip build-time rendering, render in the browser only
- `"both"` — compatibility alias. It currently behaves like `"build"`: build
  first, then client fallback only when build rendering fails

## Exports

- `mermaid(options?)` — plugin factory
- Types: `MermaidOptions`, `MermaidClientOptions`, `MermaidRenderMode`,
  `MermaidTheme`

## See also

- [Plugin guide](../../docs/plugins_en.md)
