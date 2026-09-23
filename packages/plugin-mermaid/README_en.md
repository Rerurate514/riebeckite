# @riebeckite/plugin-mermaid

Mermaid diagram rendering for ` ```mermaid ` code blocks.

[日本語](./README_ja.md)

## Overview

`mermaid()` replaces mermaid code blocks with a `<figure class="rr-mermaid">`
that renders to SVG. Diagrams are rendered at build time by default, with an
automatic client-side fallback. It runs with `order: -10`.

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
  `"both"`. SVGs are sanitized (scripts, `foreignObject`, event handlers, and
  `javascript:` URLs removed) and Mermaid runs with `securityLevel: "strict"`
- Invalid diagrams log a warning, report a diagnostic
  (`ruleId: "invalid-mermaid"`), and leave the figure as
  `data-mermaid="pending"` for client fallback

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

- `"build"` / `"both"` — render SVG at build time; diagrams that fail fall
  back to client rendering
- `"client"` — skip build-time rendering, render in the browser only

## Exports

- `mermaid(options?)` — plugin factory
- Types: `MermaidOptions`, `MermaidClientOptions`, `MermaidRenderMode`,
  `MermaidTheme`

## See also

- [Plugin guide](../../docs/plugins_en.md)
