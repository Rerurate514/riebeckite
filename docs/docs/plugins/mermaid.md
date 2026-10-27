---
date: 2026-10-06
title: Mermaid
---
# Mermaid

Mermaid diagram rendering for ` ```mermaid ` code blocks.

[日本語](./mermaid.ja.md)

For static SVG rendering without a headless browser, see [Mermaid (Pele)](./mermaid-pele.md).

## Overview

`mermaid()` replaces mermaid code blocks with a `<figure class="rr-mermaid">`
that renders to SVG. Diagrams are rendered at build time with a headless browser by
default. It runs with `order: -10`.

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

## Live example

This site renders `mermaid` fences with Mermaid (Pele), not the headless browser build. Both plugins accept the same fence:

~~~mermaid
flowchart LR
  Draft --> Review --> Published
~~~

See [Mermaid (Pele)](./mermaid-pele.md) for the renderer used here.

## Behavior

### Build

- Replaces each ` ```mermaid ` `<pre>` with a `figure.rr-mermaid` containing:
  - `figcaption.rr-mermaid__caption` — from the code block title or a
    `%% caption: ...` line in the source
  - `div.rr-mermaid__canvas` — the diagram (`role="img"`, labelled by the
    caption when present)
  - `details.rr-mermaid__fallback` — collapsible diagram source
- Static SVG is rendered at build time when `render` is `"build"` by running the
  Mermaid browser API in Puppeteer's headless Chromium.
  Rendering uses Chromium's layout engine, not JSDOM polyfills or custom
  `getBBox` / text-width estimation
- Mermaid runs with `securityLevel: "strict"`, the selected theme, transparent
  background, deterministic IDs seeded by the diagram ID, and a unique SVG id per
  diagram
- Invalid diagrams report `ruleId: "invalid-diagram"`; Chromium renderer
  failures report `ruleId: "renderer-error"`. Build rendering failures stop the
  build by default, so a failed render cannot be stored as successful content

### Client (`initMermaidDiagrams`)

- Loads Mermaid from the CDN (jsDelivr, Mermaid 11) unless `globalThis.mermaid`
  or an injected instance is provided
- Renders every `[data-mermaid="pending"]` figure; failures set
  `data-mermaid="error"` (placeholder message via CSS)
- When `theme` is `{ light, dark }`, the theme is chosen from
  `html[data-rb-mode]` or `prefers-color-scheme`

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `render` | `"build" \| "client"` | `"build"` | When diagrams are rendered |
| `onRenderError` | `"error" \| "client"` | `"error"` | Behavior when build rendering fails |
| `theme` | `string \| { light: string; dark: string }` | `{ light: "default", dark: "dark" }` | Mermaid theme |
| `caption` | `boolean` | `true` | Show title / `%% caption:` as `figcaption` |
| `fallback` | `boolean` | `true` | Show the diagram source in `<details>` |

`render` modes:

- `"build"` — render SVG at build time; failures stop the build unless
  `onRenderError` is `"client"`
- `"client"` — skip build-time rendering, render in the browser only

Set `onRenderError: "client"` only when client-side retry is an intentional
availability trade-off. This makes the generated HTML depend on the renderer's
availability.

## Exports

- `mermaid(options?)` — plugin factory
- Types: `MermaidOptions`, `MermaidClientOptions`, `MermaidRenderMode`,
  `MermaidTheme`

## See also

- [Plugin guide](../reference/plugin-api.md)
