# Vega-Lite

Renders ` ```vega-lite ` code blocks as Vega-Lite charts. Charts are drawn in the
browser, and the Vega runtime is imported dynamically only when it is needed.

[Japanese](./vega-lite.ja.md)

## Configure

```ts
import { defineConfig } from "@riebeckite/core";
import { vegaLite } from "@riebeckite/plugin-vega-lite";

export default defineConfig({
  // ...
  plugins: [
    vegaLite({
      caption: true,
      theme: "light",
      renderer: "canvas",
    }),
  ],
});
```

The plugin runs with `order: -10`.

## Syntax

Put a Vega-Lite specification as JSON in the body of the code block. Both
`vega-lite` and `vega` are accepted.

````markdown
```vega-lite
{
  "title": "Revenue",
  "data": {
    "values": [
      { "category": "A", "value": 28 },
      { "category": "B", "value": 55 }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": { "field": "category", "type": "nominal" },
    "y": { "field": "value", "type": "quantitative" }
  }
}
```
````

The caption comes from the code-block `title`, or from the specification's
`title`.

## How it renders

A ` ```vega-lite ` block becomes a `figure.rb-vega-lite`:

- `figure.rb-vega-lite`: carries `data-vega-lite="pending"` and
  `data-vega-lite-spec` (the escaped JSON)
- `div.rb-vega-lite__canvas`: the element the chart is rendered into
  (`role="img"`)
- `figcaption.rb-vega-lite__caption`: the caption (enabled by default)
- `details.rb-vega-lite__fallback`: the original spec, folded away

`initVegaLite` finds `[data-vega-lite]`, `JSON.parse`s `data-vega-lite-spec`,
then dynamically imports `vega`, `vega-lite`, and `vega-embed` and renders with
`vega-embed`. On success the figure becomes `data-vega-lite="rendered"`.

If loading `vega-embed`, parsing the spec, or embedding fails, the initializer
does not throw: it opens that figure's `details` and marks it
`data-vega-lite="error"`.

A block whose body is not valid JSON is left as a normal code block, and a
diagnostic with `source: "@riebeckite/plugin-vega-lite"` is emitted.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `caption` | `true` | Show the `title` as a caption |
| `actions` | `null` | Show the `vega-embed` actions menu (`true` / `false` / `null`) |
| `theme` | `"light"` | Colour scheme (`"light"`, `"dark"`, `"none"`) |
| `renderer` | `"canvas"` | Vega renderer (`"canvas"` or `"svg"`) |
| `className` | `"rb-vega-lite"` | Base class applied to the figure |

When `actions` is `null`, the `vega-embed` default (actions shown) applies. With
`theme` set to `"light"` or `"none"`, Vega's default light styling is used; only
`"dark"` applies the built-in `dark` theme.

## Client rendering

The client initializer is static and receives no plugin options. `actions`,
`theme`, and `renderer` are embedded into the figure's `data-vega-lite-*`
attributes, and `initVegaLite` reads them from there.

The Vega runtime is loaded with `import()`, so the page still renders when
JavaScript is disabled and the spec stays readable in the fallback `details`.

## Output hooks

- `figure[data-vega-lite]`: state (`pending` / `rendered` / `error`)
- `figure[data-vega-lite-spec]`: the escaped spec JSON
- `figure[data-vega-lite-theme]`, `figure[data-vega-lite-renderer]`,
  `figure[data-vega-lite-actions]`
- `[data-vega-lite-canvas]`: the render target
- `details.rb-vega-lite__fallback`: the original spec

## Main exports

- `vegaLite(options?)`: create the plugin (`vegaLitePlugin` is an alias)
- `initVegaLite`: initialize client-side rendering
- Types: `VegaLiteOptions`, `VegaLiteSpec`, `VegaLiteTheme`,
  `VegaLiteRenderer`

## Limitations

- Rendering is client-only. Nothing is rendered at build time, so charts are not
  visible without JavaScript (the spec remains in the fallback `details`)
- Each chart loads `vega`, `vega-lite`, and `vega-embed`, so pages with many
  charts pay for the transfer and render cost repeatedly
- Not every Vega-Lite feature is validated; complex specs surface as browser
  errors and reveal the fallback
- `vega`, `vega-lite`, and `vega-embed` are BSD-3-Clause licensed

## See also

- [Plugin system](../reference/plugin-api.md)
