# @riebeckite/plugin-sidenotes

<!-- Generated from docs/docs/plugins/sidenotes.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Tufte-style side notes for Riebeckite. Authors keep writing ordinary GFM
footnotes (`[^1]` and `[^1]: text`); the plugin rewrites the generated
footnote markup into an inline reference plus a note that renders as a margin
note on desktop and as a tap-open popover on mobile.

[日本語](./README_ja.md)

## Overview

The plugin registers a rehype plugin that rewrites the footnote markup the
core pipeline produces from `remark-gfm`:

- Each footnote reference becomes a `sup` with a small reference link
  (`[data-rr-sidenotes-ref]`) that keeps its `href="#fn-…"` target, so the
  footnote stays reachable with plain browser navigation.
- Each footnote definition becomes a `.rr-sidenotes__note` aside next to the
  reference: a static **margin note** on desktop (`@media (min-width: 48rem)`)
  and a **popover** on mobile (`@media (max-width: 48rem)`).
- The trailing footnote definitions section is kept (it is the link target
  on mobile and the no-JavaScript fallback) and hidden on desktop, where the
  margin notes are always visible.

A small client entry (`initSidenotes`) toggles the mobile popover: tap to
open/close, `Escape` to close, and click outside to close. It ignores the page
when `(min-width: 48rem)` matches — desktop margin notes need no JavaScript.

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
Riebeckite renders margin notes at the side of the text.[^1]

[^1]: The note text appears beside the reference on desktop and in a popover on mobile.
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `""` | Extra CSS class on each sidenote root |
| `ariaLabel` | `string` | `"Sidenote"` | Accessible name prefix for each note (`"Sidenote 1"`) |
| `openLabel` | `string` | `"Footnote"` | Accessible label prefix for a closed reference (`"Footnote 1"`) |
| `closeLabel` | `string` | `"Close sidenote"` | Accessible label prefix for an open reference (`"Close sidenote 1"`) |
| `popoverAlignment` | `"bottom" \| "end"` | `"bottom"` | Where the mobile popover is anchored |

```ts
sidenotes({
  ariaLabel: "Note",
  popoverAlignment: "end",
});
```

## Output

```html
<p>
  Riebeckite renders margin notes here.<sup class="rr-sidenotes__ref">
  <a href="#user-content-fn-1" id="user-content-fnref-1" class="rr-sidenotes__toggle"
     data-rr-sidenotes-ref aria-expanded="false" aria-controls="rr-sidenotes-1"
     aria-label="Footnote 1">1</a></sup>
</p>
<aside class="rr-sidenotes__note rr-sidenotes__note--popover-bottom" id="rr-sidenotes-1"
       data-rr-sidenotes-note aria-label="Sidenote 1" tabindex="-1">
  <span class="rr-sidenotes__index" aria-hidden="true">1</span>
  <div class="rr-sidenotes__body"><p>The note text appears beside the reference.</p></div>
</aside>
```

## Accessibility

- The reference is a real link (`href="#user-content-fn-…"`) with `aria-expanded`
  and `aria-controls`; the client toggles `aria-expanded` and swaps the label
  between `openLabel` and `closeLabel`.
- The popover is labelled with `aria-label` and receives focus (`tabindex="-1"`)
  when opened via a script.
- Without JavaScript, tapping the reference jumps to the footnote definitions
  as in ordinary GFM output.

## Style

The package ships `style.css`. Register it like any other plugin stylesheet:

```ts
import "@riebeckite/plugin-sidenotes/style.css";
```

Stable hooks follow the `rr-sidenotes` convention: `rr-sidenotes__toggle`,
`rr-sidenotes__note`, `rr-sidenotes__index`, `rr-sidenotes__body`,
`rr-sidenotes__footnotes`, plus the `rr-sidenotes__note--open` modifier.

## Exports

- `sidenotes(options?)` — plugin factory
- `sidenotesPlugin` — alias of `sidenotes`
- `rehypeSidenotes(options?)` — the rehype transformer
- `resolveSidenotesOptions(options?)` — apply option defaults
- `renderSidenotesReference(input)` / `renderSidenotesNote(input)` — HTML builders
- `initSidenotes(options?)` — client popover initializer
- Types: `SidenotesOptions`, `ResolvedSidenotesOptions`, `SidenotesClientOptions`

## Limitations

- Footnotes that reuse the same definition share one margin note and popover.
- The footnote definitions section is hidden on desktop; margins must have
  room for the notes, and themes can restyle `.rr-sidenotes__note` freely.
- Notes inside tables or deeply nested inline markup are placed after the
  nearest block ancestor, so their vertical position is approximate.

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
