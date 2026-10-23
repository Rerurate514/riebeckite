# @riebeckite/plugin-chartjs

<!-- Generated from docs/docs/plugins/chartjs.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Render ` ```chart ` code blocks as responsive [Chart.js](https://www.chartjs.org/)
charts.

[日本語](./README_ja.md)

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
<figure class="rb-chartjs" data-diagram="chartjs" data-diagram-status="pending" data-diagram-id="rb-chartjs-…" data-chartjs-marker="RIEBECKITE_EXTERNAL_CHARTJS_MARKER">
  <figcaption class="rb-chartjs__caption" data-diagram-caption="true">Weekly visits</figcaption>
  <canvas
    class="rb-chartjs__canvas"
    data-diagram-content="true"
    data-diagram-config="{&quot;type&quot;:&quot;bar&quot;,...}"
    role="img"
    aria-labelledby="rb-chartjs-…-caption"
  ></canvas>
  <details class="rb-chartjs__fallback" data-diagram-fallback="true">…</details>
</figure>
````

- `.rb-chartjs` — figure wrapper (responsive, themed with `--rb-color-*`)
- `.rb-chartjs__canvas` — the `<canvas>` Chart.js draws into; its
  `data-diagram-config` attribute holds the escaped JSON configuration
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

Chart.js is **not** bundled at build time. The site's client bundle calls
`initChartJs` through the shared diagram client lifecycle. It renders pending
`[data-diagram="chartjs"]` figures, imports `chart.js/auto`, and finalizes each
Chart.js instance on page unmount. A failure marks that figure as `error` and
opens its source fallback.

## Limitations

- The E2E build only asserts the emitted markup; charts need a real browser to
  appear.
- The chart configuration is inlined as an HTML attribute, so keep datasets
  reasonably small.
- Only the `chart` info string is recognized; other languages are untouched.

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
