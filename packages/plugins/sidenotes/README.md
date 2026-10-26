# @riebeckite/plugin-sidenotes

<!-- Generated from docs/docs/plugins/sidenotes.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Footnote styling for Riebeckite. Authors keep writing ordinary GFM footnotes
(`[^1]` and `[^1]: text`). By default the definitions stay in the trailing
footnote list at the end of the article. Set `placement: "margin"` to render
them as Tufte-style margin notes instead.

[日本語](./README_ja.md)

## Overview

The plugin registers a rehype plugin that reads the footnote markup the core
pipeline produces from `remark-gfm`.

With the default `placement: "end"`:

- The trailing `<section data-footnotes>` gets `.rr-sidenotes__footnotes` and
  `data-rr-sidenotes-placement="end"`.
- Each reference gets `rr-sidenotes__ref` on its `sup` and
  `rr-sidenotes__toggle` on the link. The native `href`, `id`, and back-links
  are left untouched, so navigation keeps working without JavaScript.
- The section stays at the end of the article at every width.

With `placement: "margin"`:

- Each definition becomes a `.rr-sidenotes__note` aside after the nearest block
  that contains its first reference. The note stays in the article flow until
  there is room for an article rail, then becomes sticky in the right margin
  (`@media (min-width: 88rem)`).
- The reference points at the note (`href="#rr-sidenotes-…"`).
- The trailing definitions section is hidden with
  `data-rr-sidenotes-placement="margin"`.

The plugin ships no client entry; both placements work without JavaScript.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { sidenotes } from "@riebeckite/plugin-sidenotes";

export default defineConfig({
  // ...
  plugins: [sidenotes()],
});
```

Write normal GFM footnotes:

```md
Riebeckite keeps notes in the footnote list at the end.[^1]

[^1]: The note text appears at the end of the article.
```

To render margin notes instead:

```ts
plugins: [sidenotes({ placement: "margin" })];
```

## Live example

A footnote reference appears here.[^live-example]

[^live-example]: The note is rendered by the sidenotes plugin.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `placement` | `"end" \| "margin"` | `"end"` | `"end"` keeps the trailing footnote list; `"margin"` moves definitions next to their references |
| `className` | `string` | `""` | Extra CSS class on each margin note (ignored when `placement` is `"end"`) |
| `ariaLabel` | `string` | `"Sidenote"` | Accessible name prefix for each margin note (`"Sidenote 1"`) |
| `openLabel` | `string` | `"Footnote"` | Accessible label prefix for each reference (`"Footnote 1"`) |

```ts
sidenotes({
  placement: "margin",
  ariaLabel: "Note",
});
```

## Output

Default (`placement: "end"`):

```html
<p>
  Riebeckite keeps notes here.<sup class="rr-sidenotes__ref">
  <a href="#user-content-fn-1" id="user-content-fnref-1" data-footnote-ref
     class="rr-sidenotes__toggle" aria-label="Footnote 1">1</a></sup>
</p>
<section data-footnotes class="footnotes rr-sidenotes__footnotes"
         data-rr-sidenotes-placement="end">
  <h2 class="sr-only" id="footnote-label">Footnotes</h2>
  <ol><li id="user-content-fn-1"><p>The note text.</p></li></ol>
</section>
```

`placement: "margin"`:

```html
<p>
  Riebeckite keeps notes here.<sup class="rr-sidenotes__ref">
  <a href="#rr-sidenotes-1" id="user-content-fnref-1" class="rr-sidenotes__toggle"
     data-rr-sidenotes-ref aria-label="Footnote 1">1</a></sup>
</p>
<aside class="rr-sidenotes__note" id="rr-sidenotes-1"
       data-rr-sidenotes-note aria-label="Sidenote 1" tabindex="-1">
  <span class="rr-sidenotes__index" aria-hidden="true">1</span>
  <div class="rr-sidenotes__body"><p>The note text.</p></div>
</aside>
```

## Accessibility

- With `placement: "end"`, references keep the native GFM href, id, and
  back-links; only the `aria-label` from `openLabel` is added.
- With `placement: "margin"`, the reference links to the note, and the note is
  labelled with `aria-label` and can receive focus (`tabindex="-1"`).
- The footnote list and references use `scroll-margin-block-start` so the
  target is not hidden behind a sticky header.

## Style

The package ships `style.css`. Register it like any other plugin stylesheet:

```ts
import "@riebeckite/plugin-sidenotes/style.css";
```

Stable hooks follow the `rr-sidenotes` convention: `rr-sidenotes__toggle`,
`rr-sidenotes__ref`, `rr-sidenotes__note`, `rr-sidenotes__index`,
`rr-sidenotes__body`, and `rr-sidenotes__footnotes`.

## Exports

- `sidenotes(options?)` — plugin factory
- `sidenotes` — alias of `sidenotes`
- `rehypeSidenotes(options?)` — the rehype transformer
- `resolveSidenotesOptions(options?)` — apply option defaults
- `renderSidenotesReference(input)` / `renderSidenotesNote(input)` — HTML builders
- Types: `SidenotesOptions`, `ResolvedSidenotesOptions`

## Limitations

- With `placement: "margin"`, footnotes that reuse the same definition share
  one note.
- In margin placement the trailing definitions section stays in the DOM but is
  hidden; themes can restyle `.rr-sidenotes__note` freely.
- Notes inside tables or deeply nested inline markup are placed after the
  nearest block ancestor, so their vertical position is approximate.

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
