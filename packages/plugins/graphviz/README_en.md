# @riebeckite/plugin-graphviz

Graphviz (DOT) diagram rendering for ` ```dot ` and ` ```graphviz ` code blocks.

[日本語](./README_ja.md)

## Overview

`graphviz()` replaces DOT code blocks with a `<figure class="rb-graphviz">` that
renders to SVG. Diagrams are rendered at build time by default using the
[`@viz-js/viz`](https://github.com/mdaines/viz-js) WebAssembly build of Graphviz,
which runs fully offline inside Node and lets the build process exit cleanly (no
leaked workers or timers). It runs with `order: -10`.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { graphviz } from "@riebeckite/plugin-graphviz";

export default defineConfig({
  // ...
  plugins: [
    graphviz({
      render: "build",
      engine: "dot",
    }),
  ],
});
```

````markdown
```dot
// caption: Request flow
digraph {
  rankdir="LR"
  client -> server [label="request"]
  server -> client [label="response"]
}
```
````

The fenced info string `graphviz` is accepted as an alias of `dot`.

## Behavior

### Build

- Replaces each DOT `<pre>` with a `figure.rb-graphviz` containing:
  - `figcaption.rb-graphviz__caption` — from the code block title or a
    `// caption: ...` line in the source
  - `div.rb-graphviz__canvas` — the diagram (`role="img"`, labelled by the
    caption when present)
  - `details.rb-graphviz__fallback` — collapsible DOT source
- Static SVG is rendered at build time when `render` is `"build"` or `"both"`,
  using the WASM Graphviz layout engine. The XML prolog and DOCTYPE emitted by
  Graphviz are stripped so the SVG can be inlined in HTML.
- Invalid DOT reports `ruleId: "invalid-diagram"`; WASM/renderer failures report
  `ruleId: "renderer-error"`, both under
  `source: "@riebeckite/plugin-graphviz"`.
- Each figure carries stable hooks:
  - `class="rb-graphviz"`
  - `data-graphviz="rendered" | "pending" | "error"`
  - `data-graphviz-engine="dot"`
  - `data-graphviz-source="..."` (the escaped DOT source)

### Client (`initGraphvizDiagrams`)

- Used by `"client"` mode, and as a fallback for failed `"both"` builds.
- Fetches `@viz-js/viz` from jsDelivr as an ES module unless a renderer is
  injected through `options.renderer` or `globalThis.viz`.
- Renders every `[data-graphviz="pending"]` figure and flips the state to
  `data-graphviz="rendered"`; failures set `data-graphviz="error"` (placeholder
  message via CSS).

## Rendering offline

Build-time rendering needs no network access. `@viz-js/viz` ships the Graphviz
engine as WebAssembly and runs in-process under Node; the module is imported
dynamically so it never enters the client bundle. It was chosen over
`@hpcc-js/wasm` because its Node lifecycle is clean — the process exits without
a lingering worker.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `render` | `"build" \| "client" \| "both"` | `"build"` | When diagrams are rendered |
| `engine` | `"dot" \| "neato" \| "fdp" \| "sfdp" \| "circo" \| "twopi"` | `"dot"` | Graphviz layout engine |
| `caption` | `boolean` | `true` | Show the title / `// caption:` as `figcaption` |
| `fallback` | `boolean` | `true` | Show the DOT source in `<details>` |
| `className` | `string` | `"rb-graphviz"` | Base class for the `<figure>` (sub-elements use `__canvas`, `__caption`, `__fallback`) |

`render` modes:

- `"build"` — render SVG at build time; invalid diagrams are reported and the
  figure becomes `data-graphviz="error"`
- `"client"` — skip build-time rendering, render in the browser only
- `"both"` — build first, then fall back to client rendering when build
  rendering fails

## CSS hooks

- `.rb-graphviz`, `.rb-graphviz__canvas`, `.rb-graphviz__caption`,
  `.rb-graphviz__fallback`
- `[data-graphviz="pending"]` / `[data-graphviz="error"]` show a placeholder
- Dark mode follows `html[data-theme="dark"]` / `html.dark`

## Exports

- `graphviz(options?)` — plugin factory (`graphvizPlugin` is an alias)
- `initGraphvizDiagrams` — client initializer (`@riebeckite/plugin-graphviz/client`)
- Types: `GraphvizOptions`, `GraphvizClientOptions`, `GraphvizRenderMode`,
  `GraphvizEngine`

## Limitations

- The client renderer loads `@viz-js/viz` from the jsDelivr CDN; offline client
  rendering requires an injected `renderer`.
- HTML-like labels (`label=<...>`) are supported by Graphviz, but only standard,
  safe output should be trusted; the plugin does not sanitize generated SVG.
- Captions use the code block title or a leading `// caption: ...` comment.

## See also

- [Plugin guide](../../docs/plugins_en.md)
