# WaveDrom

Renders ` ```wavedrom ` code blocks as [WaveDrom](https://wavedrom.com/) timing diagrams.

[日本語](./wavedrom.ja.md)

## Overview

`wavedrom()` replaces ` ```wavedrom ` (and ` ```wavejson `) code blocks with a `<figure>` that carries the normalized WaveJSON in a `data-wavedrom-spec` attribute. The diagram itself is drawn in the browser by `initWaveDrom`, which dynamically imports `wavedrom`. The build only emits markup. Execution order is `order: -10`.

## Configuration

```ts
import { defineConfig } from "@riebeckite/core";
import { wavedrom } from "@riebeckite/plugin-wavedrom";

export default defineConfig({
  // ...
  plugins: [
    wavedrom({
      skin: "default",
      caption: true,
    }),
  ],
});
```

## Writing a diagram

The block body is a **strict JSON** WaveJSON object. Keys must be double-quoted, and trailing commas or comments are not allowed.

````markdown
```wavedrom
{
  "signal": [
    { "name": "clk", "wave": "p......" },
    { "name": "bus", "wave": "x.34.5x", "data": "head body tail" },
    { "name": "wire", "wave": "0.1..0." }
  ]
}
```
````

Top-level keys other than `signal`, `assign`, and `reg` — such as WaveDrom's `head`, `config`, and `foot` — are passed through unchanged.

```wavedrom
{
  "head": { "text": "handshake" },
  "signal": [
    { "name": "req", "wave": "01..0" },
    { "name": "ack", "wave": "0.1.0" }
  ]
}
```

### Captions

A caption is taken from the code block's `title`.

````markdown
```wavedrom title="Read cycle"
{ "signal": [{ "name": "clk", "wave": "p..." }] }
```
````

You can also use a top-level `"caption"` key in the JSON. It is removed before the diagram is rendered, so it never reaches WaveDrom.

````markdown
```wavedrom
{
  "caption": "Read cycle",
  "signal": [{ "name": "clk", "wave": "p..." }]
}
```
````

## Output

```html
<figure class="rb-wavedrom" data-wavedrom="pending" data-wavedrom-spec="{&quot;signal&quot;:[...]}" data-wavedrom-skin="default">
  <figcaption id="rb-wavedrom-xxxx-caption" class="rb-wavedrom__caption">Read cycle</figcaption>
  <div class="rb-wavedrom__canvas" data-wavedrom-canvas="true" role="img" aria-labelledby="rb-wavedrom-xxxx-caption"></div>
  <details class="rb-wavedrom__fallback">
    <summary>WaveJSON source</summary>
    <pre><code>{ ... }</code></pre>
  </details>
</figure>
```

- `.rb-wavedrom` — the figure wrapper; inherits `--rb-color-*` for theming
- `.rb-wavedrom__canvas` — where WaveDrom draws the SVG; marked with `data-wavedrom-canvas="true"`
- `.rb-wavedrom__caption` — the `<figcaption>` when a caption is present
- `.rb-wavedrom__fallback` — a `<details>` holding the WaveJSON source

The `data-wavedrom` attribute reports render state: `pending` initially, `rendered` on success, and `error` on failure. On failure the fallback `<details>` is opened.

## Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `skin` | `"default" \| "narrow" \| "lowkey"` | `"default"` | WaveDrom skin used by the browser renderer |
| `caption` | `boolean` | `true` | Render the extracted caption as a `<figcaption>` |
| `fallback` | `boolean` | `true` | Render the WaveJSON source in a `<details>` block |
| `className` | `string` | `"rb-wavedrom"` | Base class applied to the figure |

## Diagnostics

If the body is not valid JSON, is not an object, or has no `signal` / `assign` / `reg`, the original code block is left in place and a diagnostic is emitted with `source: "@riebeckite/plugin-wavedrom"` and `ruleId: "invalid-config"`.

## Client rendering

`wavedrom` is not bundled at build time. The site's client bundle must call `initWaveDrom`, which `wavedrom()` wires up via `createClientEntry`. The initializer finds `figure[data-wavedrom="pending"]`, `JSON.parse`s each `data-wavedrom-spec`, dynamically imports `wavedrom`, and draws the SVG into `<div class="rb-wavedrom__canvas">` with `WaveDrom.RenderWaveForm`. When `data-wavedrom-skin` is present, the matching skin is loaded. A broken payload or a rendering error only marks that figure as `data-wavedrom="error"` and opens its fallback.

## Limitations

- Rendering is client-only. Without JavaScript the SVG is never produced and only the WaveJSON source remains
- The E2E build checks the emitted markup only; actual rendering requires a browser
- The body must be strict JSON. The JSON5 form accepted by the WaveDrom editor (unquoted keys, single quotes, comments) is not supported
- The WaveJSON is embedded directly in an HTML attribute, so keep diagrams reasonably small
- Only the `wavedrom` and `wavejson` info strings are recognized; other languages are unaffected

## See also

- [Plugin system](../reference/plugin-api.md)
