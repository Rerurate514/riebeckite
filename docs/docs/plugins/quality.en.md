<!-- Generated from packages/plugins/quality/README.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Quality

Static quality and accessibility inspection for generated HTML in Riebeckite.

[日本語](./quality.md)

## Overview

`qualityPlugin()` runs a small set of dependency-free, regex-based rules over
the HTML produced by the build and reports the findings through the shared
diagnostics channel. There is no DOM, no axe-core, and no headless browser.

At the manifest stage the plugin inspects each public entry's rendered article
HTML. Integrations that finish HTML generation can additionally call the
exported `inspectGeneratedHtml` hook for final pages.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { qualityPlugin } from "@riebeckite/plugin-quality";

export default defineConfig({
  // ...
  plugins: [qualityPlugin({ failOn: "error" })],
});
```

## Options

| Option | Type | Description |
| ------ | ---- | ----------- |
| `ignoreRules` | `string[]` | Diagnostic codes to suppress (for example `"quality:empty-link-text"`). |
| `a11y` | `{ enabled?: boolean }` | Accessibility inspection. Defaults to enabled; set `enabled: false` to disable every rule. |
| `failOn` | `"error" \| "never"` | Throw on the first build with an error-severity diagnostic during the manifest stage. Defaults to `"never"`. |

## Rules

| Code | Severity | Description |
| ---- | -------- | ----------- |
| `quality:img-alt-missing` | warning | `<img>` without an `alt` attribute. `alt=""` is valid for decorative images. |
| `quality:duplicate-id` | error | The same `id` value used more than once. |
| `quality:broken-internal-anchor` | warning | `href="#foo"` with no matching `id="foo"` in the document. |
| `quality:heading-order` | warning | Skipped heading levels (for example `h1` → `h3`) or headings without any `h1`. |
| `quality:empty-link-text` | warning | `<a href>` with empty text and no `aria-label`, `title`, or non-empty `img[alt]`. |
| `quality:html-lang-missing` | warning | `<html>` without a non-empty `lang` attribute (full documents only). |
| `quality:table-no-header` | warning | `<table>` with data cells but no `<th>`, `scope`, or `headers`. |

## API

- `qualityPlugin(options?)` — plugin factory.
- `inspectHtml(html, options?)` — pure function returning `Diagnostic[]`.
- `inspectGeneratedHtml(page, options?)` — pure function that inspects a final
  page and sets `filePath` to `page.path`.
- `RULE_CODES` — the stable code identifiers.
- Types: `QualityOptions`, `InspectOptions`.

## Limitations

The scanner is regex-based, not a real DOM. It does not validate malformed
markup, does not track nesting depth, and only handles well-formed, non-nested
elements when pairing an open tag with its close tag. Comments and
`<script>`/`<style>` contents are masked before scanning. Rules that depend on
document structure (heading order, table headers) can therefore miss or
misattribute findings in unusual markup.

## See also

- [Plugin guide](../reference/plugin-api.en.md)
