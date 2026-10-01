# @riebeckite/plugin-pdf

Inline PDF attachment viewing for Obsidian wikilinks.

[日本語](./README_ja.md)

## Overview

`pdf()` renders embedded PDF attachments (`![[report.pdf]]`) with the
browser-native PDF viewer instead of a download-only card. The renderer is
SSR/build-time only; no client JavaScript is required.

`@riebeckite/plugin-obsidian-markdown` resolves a non-image, non-Markdown
wikilink target to the generic `attachment` render kind, so PDFs are detected
by their `.pdf` extension. A literal `kind: "pdf"` target is also accepted, so
the plugin keeps working if a producer reports a PDF-specific kind later.

The renderer runs before `@riebeckite/plugin-attachment` and
`@riebeckite/plugin-media` (plugin `order: -20`), so a PDF embed is never
captured by the generic attachment card. Register `attachment()` alongside to
keep download links for non-PDF files.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { pdf } from "@riebeckite/plugin-pdf";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), attachment(), pdf()],
});
```

## Rendering

Embed (`![[report.pdf]]`):

```html
<figure class="rr-pdf" data-pdf-path="..." style="--rr-pdf-height: 640px">
  <object
    class="rr-pdf__viewer"
    data="/assets/attachments/report.pdf#page=1"
    type="application/pdf"
    aria-label="report.pdf"
  >
    <a class="rr-pdf__fallback" href="..." download>Download PDF</a>
  </object>
  <figcaption class="rr-pdf__meta">
    <span class="rr-pdf__format">PDF</span>
    <span class="rr-pdf__name">report.pdf</span>
    <span class="rr-pdf__size">1.2 MB</span>
    <a class="rr-pdf__download" href="..." download>Download PDF</a>
  </figcaption>
</figure>
```

- The `<object>` uses the browser's built-in PDF viewer; its nested link is the
  graceful fallback for clients without PDF support.
- A visible download link and the format badge, file name, and size are always
  available below the viewer. Size is read from `config.content.directory` and
  omitted when the file cannot be read.
- `initialPage` and `toolbar` are encoded as the viewer URL fragment
  (`#page=2&toolbar=0`). This is the cross-browser convention; individual PDF
  viewers may ignore parts of it.
- The embed carries the stable `rr-pdf` root hook that themes may target.

Plain links (`[[report.pdf]]`) are left to `@riebeckite/plugin-attachment` (or
the Markdown fallback), which renders the existing download link.

## Options

| Option          | Type               | Default          | Description                                                       |
| --------------- | ------------------ | ---------------- | ----------------------------------------------------------------- |
| `height`        | `string \| number` | `"640px"`        | Viewer height. Numbers become pixels; strings are CSS lengths.    |
| `initialPage`   | `number`           | `1`              | First page the native viewer opens.                               |
| `toolbar`       | `boolean`          | `true`           | `false` appends `#toolbar=0` to hide the viewer toolbar.          |
| `showMetadata`  | `boolean`          | `true`           | Show the format badge, file name, and size under the viewer.      |
| `downloadLabel` | `string`           | `"Download PDF"` | Label for the download links.                                     |

Styles ship in `style.css`.

## Exports

- `pdf(options?)` / `pdfPlugin` — plugin factory
- `buildPdfViewerUrl(url, options)` — viewer URL builder
- `isPdfRenderTarget(context)` — PDF target predicate
- `renderPdf(context, options)` — renderer implementation
- Types: `PdfOptions`, `ResolvedPdfOptions`

## See also

- [Plugin guide](../../../docs/en/docs/reference/plugin-api.md)
- [`@riebeckite/plugin-obsidian-markdown`](../obsidian-markdown/README.md)
- [`@riebeckite/plugin-attachment`](../attachment/README.md)

