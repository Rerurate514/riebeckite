<!-- Generated from packages/plugins/qr-code/README.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# QR Code

Renders ` ```qr ` fenced code blocks into inline SVG QR codes at build time.

[日本語](./qr-code.ja.md)

## Overview

`qrCode()` replaces each ` ```qr ` code block with a
`<figure class="rb-qr">` containing an inline `<svg>` QR code. Encoding happens
entirely at build time in Node; nothing is shipped to the browser. The plugin
runs with `order: -10`, before `code-enhance` and `code-tabs`.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { qrCode } from "@riebeckite/plugin-qr-code";

export default defineConfig({
  // ...
  plugins: [
    qrCode({
      level: "M",
      margin: 1,
      width: 160,
      dark: "#000000",
      light: "#ffffff",
    }),
  ],
});
```

````md
```qr
# caption: Project page
https://example.com/
```
````

The fence body is the text or URL to encode (trimmed). An empty body leaves the
code block untouched and reports a `@riebeckite/plugin-qr-code` diagnostic.

## Behavior

Each block becomes:

```html
<figure class="rb-qr" data-qr="rendered" data-qr-level="M" data-qr-margin="1" style="--rb-qr-size:160px">
  <div class="rb-qr__canvas" role="img" aria-label="QR code"><svg>…</svg></div>
  <figcaption class="rb-qr__caption">
    <span class="rb-qr__caption-text">…</span>
    <a class="rb-qr__source" href="…">…</a>
  </figcaption>
</figure>
```

- `data-qr` is `"rendered"` on success and `"error"` when the encoder is
  unavailable or the block cannot be encoded.
- The encoded payload is always rendered as plain text in
  `figcaption.rb-qr__caption`, so the value stays readable and copyable even
  without scanning the code. An `http:`, `https:`, `mailto:`, or `tel:` payload
  becomes an `<a class="rb-qr__source">`; anything else stays a `<span>`.
- The card width follows the `width` option instead of the payload, so a long
  URL wraps rather than stretching the figure.
- Errors and empty blocks report a snippet diagnostic with
  `source: "@riebeckite/plugin-qr-code"`.

### Encoder loading

The QR encoder (`qrcode`) is imported dynamically at build time, so bundlers
never pull it into the site or client bundle. When the plugin is bundled into a
temporary config module and the bare specifier no longer resolves, the loader
falls back to `node_modules` discovered from `process.cwd()` and the pnpm
virtual store.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `level` | `"L" \| "M" \| "Q" \| "H"` | `"M"` | Error-correction level |
| `margin` | `number` | `1` | Quiet-zone size in modules |
| `width` | `number` | `160` | Rendered size in pixels |
| `size` | `number` | — | Alias of `width` |
| `dark` | `string` | `"#000000"` | Dark-module colour |
| `light` | `string` | `"#ffffff"` | Light-module colour |
| `caption` | `boolean` | `true` | Show a caption from the title / `# caption:` line |
| `className` | `string` | `"rb-qr"` | Figure CSS class |
| `language` | `string` | `"qr"` | Fence language to intercept |

The caption comes from the code-block `title` (code meta) or a leading
`# caption: …` line. A leading caption line is removed from the encoded body.

## Exports

- `qrCode(options?)` — plugin factory
- `qrCodePlugin` — alias of `qrCode`
- `resolveQrCodeOptions(options?)` — normalise options
- `buildQrSvg(text, options)` — encode text into an SVG string
- Types: `QrCodeOptions`, `ResolvedQrCodeOptions`, `QrCodeLevel`,
  `QrBuildResult`

## See also

- [Plugin guide](../reference/plugin-api.md)
