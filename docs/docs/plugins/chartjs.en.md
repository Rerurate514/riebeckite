<!-- Generated from packages/plugins/chartjs/README.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Chart.js

Render ` ```chart ` code blocks as responsive [Chart.js](https://www.chartjs.org/)
charts.

[日本語](./chartjs.md)

## Overview

`chartjs()` rewrites each ` ```chart ` fenced code block into a `<figure>`
that carries the Chart.js configuration as JSON. The charts themselves are
drawn in the browser by `initChartJs`, which dynamically imports
`chart.js/auto`; the build only emits the markup. It runs with `order: -10`.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { chartjs } from "@riebeckite/plugin-chartjs";

export default defineConfig({
  // ...
  plugins: [
    chartjs({
      responsive: true,
      caption: true,
    }),
  ],
});
```

## Writing a chart

The body of a `chart` block is a JSON object. Use either a complete Chart.js
configuration:

````markdown
```chart
{
  "type": "bar",
  "data": {
    "labels": ["Mon", "Tue", "Wed"],
    "datasets": [{ "label": "Visits", "data": [12, 19, 8] }]
  },
  "options": { "plugins": { "legend": { "display": false } } }
}
```
````

or the shorthand form, where `labels` and `datasets` sit at the top level and
are normalized into `data`:

````markdown
```chart
{
  "type": "line",
  "labels": ["Mon", "Tue", "Wed"],
  "datasets": [{ "label": "Visits", "data": [12, 19, 8] }]
}
```
````

Any other top-level keys (`options`, `plugins`, …) are preserved on the
normalized configuration.

### Captions

A caption is taken from the code block `title`:

````markdown
```chart title="Weekly visits"
{ "type": "bar", "labels": ["Mon"], "datasets": [{ "data": [1] }] }
```
````

or from a `"caption"` key in the JSON. The key is removed before the
configuration is serialized, so Chart.js never sees it:

````markdown
```chart
{
  "type": "bar",
  "caption": "Weekly visits",
  "labels": ["Mon"],
  "datasets": [{ "data": [1] }]
}
```
````

## Output

````html
<figure class="rb-chartjs" data-chartjs-marker="RIEBECKITE_EXTERNAL_CHARTJS_MARKER">
  <canvas
    class="rb-chartjs__canvas"
    data-chartjs-config="{&quot;type&quot;:&quot;bar&quot;,...}"
    role="img"
    aria-label="Weekly visits"
  ></canvas>
  <figcaption class="rb-chartjs__caption">Weekly visits</figcaption>
</figure>
````

- `.rb-chartjs` — figure wrapper (responsive, themed with `--rb-color-*`)
- `.rb-chartjs__canvas` — the `<canvas>` Chart.js draws into; its
  `data-chartjs-config` attribute holds the escaped JSON configuration
- `.rb-chartjs__caption` — the `<figcaption>` shown when a caption is present

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `responsive` | `boolean` | `true` | Default for `options.responsive` on charts that do not set it |
| `caption` | `boolean` | `true` | Render the caption as a `<figcaption>` |
| `className` | `string` | `"rb-chartjs"` | Base class for the figure |

## Diagnostics

A block whose body is not valid JSON, is not an object, is missing `type`, or
lacks `data`/`labels`/`datasets` is left untouched and reported as a
diagnostic with `source: "@riebeckite/plugin-chartjs"` and
`ruleId: "invalid-config"`.

## Client rendering

Chart.js is **not** bundled at build time. The site's client bundle must call
`initChartJs`, which `chartjs()` wires up through `createClientEntry`. It looks
for `canvas[data-chartjs-config]`, parses each payload, imports
`chart.js/auto`, and constructs a chart per canvas. A parse error or a Chart.js
exception skips that canvas only.

## Limitations

- The E2E build only asserts the emitted markup; charts need a real browser to
  appear.
- The chart configuration is inlined as an HTML attribute, so keep datasets
  reasonably small.
- Only the `chart` info string is recognized; other languages are untouched.

## See also

- [Plugin guide](../reference/plugin-api.en.md)
