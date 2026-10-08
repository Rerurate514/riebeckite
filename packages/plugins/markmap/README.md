# @riebeckite/plugin-markmap

<!-- Generated from docs/docs/plugins/markmap.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Renders ` ```markmap ` code blocks as Markdown-heading mindmaps. The mindmap is
drawn in the browser by `markmap-lib` + `markmap-view`, which are imported from
the CDN only when a figure is present.

[Japanese](./README_ja.md)

## Configure

```ts
import { defineConfig } from "@riebeckite/core";
import { markmap } from "@riebeckite/plugin-markmap";

export default defineConfig({
  // ...
  plugins: [
    markmap({
      caption: true,
      height: 320,
      fallback: true,
    }),
  ],
});
```

The plugin runs with `order: -10`.

## Syntax

The block body is ordinary Markdown: headings become nodes and their nesting
becomes the tree. Content other than headings is ignored.

````markdown
```markmap
# Project

## Design

### Notation
### Rendering

## Delivery
```
````

The caption comes from the code-block `title`.

## How it renders

A ` ```markmap ` block becomes a `figure.rb-markmap`:

- `figure.rb-markmap`: carries `data-markmap="pending"`,
  `data-markmap-source` (the raw Markdown) and `data-markmap-height`
- `div.rb-markmap__canvas`: the element the SVG is rendered into
  (`role="img"`)
- `figcaption.rb-markmap__caption`: the caption (enabled by default)
- `details.rb-markmap__fallback`: the raw Markdown, folded away

`initMarkmap` finds every `[data-markmap="pending"]`, loads the runtime, runs
`markmap-lib`'s `Transformer` over `data-markmap-source`, and renders the
resulting tree with `markmap-view`'s `Markmap.create`. On success the figure
becomes `data-markmap="rendered"`.

If loading the runtime, transforming the source, or rendering fails, the
initializer does not throw: it opens that figure's `details` and marks it
`data-markmap="error"`.

A block whose body has no Markdown heading is left as a normal code block, and a
diagnostic with `source: "@riebeckite/plugin-markmap"` is emitted.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `caption` | `true` | Show the code-block `title` as a caption |
| `height` | `320` | Canvas height in pixels |
| `className` | `"rb-markmap"` | Base class applied to the figure |
| `language` | `"markmap"` | Fenced-code language to recognize |
| `fallback` | `true` | Render the `<details>` block with the raw Markdown |
| `colorFreezeLevel` | — | Depth at which node colours are frozen |

## Client rendering

The client initializer is static and receives no plugin options. `height` and
`colorFreezeLevel` are embedded into the figure's `data-markmap-*` attributes,
and `initMarkmap` reads them from there.

`markmap-lib` and `markmap-view` are fetched from jsDelivr with a computed
import specifier, so they are never bundled into the host's client bundle.
`markmap-view` pulls `d3` in as its own dependency. Because the libraries are
loaded lazily, the page still renders (with the fallback `details`) when
JavaScript is disabled.

## The input-notation seam

The code-block body is turned into a mindmap tree by a single, pure function in
`src/parse.ts`:

```ts
parseMarkmapSource(source: string): MarkmapNode | null
```

`MarkmapNode` is the notation-neutral tree (`{ content, children, payload? }`).
Only the standard Markdown-heading notation is implemented today. A future
alternative notation (for example an "ExcaliMindMap"-style outline) is added by
implementing another parser that produces the same `MarkmapNode` shape; the
figure emission and the render path do not parse the notation themselves, so
they stay unchanged. `parseMarkmapSource` is exported from the package entry
point for that purpose.

## Output hooks

- `figure[data-markmap]`: state (`pending` / `rendered` / `error`)
- `figure[data-markmap-source]`: the raw Markdown
- `figure[data-markmap-height]`, `figure[data-markmap-color-freeze-level]`
- `[data-markmap-canvas]`: the render target
- `details.rb-markmap__fallback`: the raw Markdown

## Main exports

- `markmap(options?)`: create the plugin (`markmapPlugin` is an alias)
- `initMarkmap`: initialize client-side rendering
- `parseMarkmapSource`: parse the standard notation into a tree
- `describeMarkmapTree`: derive an accessible label from a tree
- Types: `MarkmapOptions`, `MarkmapNode`, `MarkmapClientOptions`

## Limitations

- Rendering is client-only. Nothing is rendered at build time, so mindmaps are
  not visible without JavaScript (the source remains in the fallback `details`)
- The client fetches `markmap-lib`, `markmap-view`, and their CDN sub-modules on
  first use, so the first render waits on the network
- Not every Markdown extension is supported by the standard notation; the
  parser recognises ATX (`#`) headings and ignores fenced code blocks
- `markmap-lib` and `markmap-view` are MIT licensed

## See also

- [Plugin system](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
