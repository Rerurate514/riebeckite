# @riebeckite/theme-rerurate

A Rerurate theme for Riebeckite, built on the Rerurate Visual Grammar: warm
Paper / Ink flat surfaces, a signature Orange accent, 1px rules, and an 8px
grid.

[日本語](./README_ja.md)

## Overview

`rerurateTheme()` creates a theme named `rerurate`, following the same
`ThemeConfig` API and token contract as the other Riebeckite themes. Design
tokens are exposed as CSS custom properties (`--rb-color-*`, `--rb-font-*`,
`--rb-space-*`, `--rb-layout-*`) and mapped into Tailwind theme values in an
`@theme` block.

The palette is the Rerurate brand set:

- **Light** — warm Paper (`#f6efe2`), Ink (`#171717`), and the signature
  Orange (`#f66620`)
- **Dark** — a warm charcoal paper (`#1c1a17`) with Paper-toned ink
  (`#f6efe2`); Orange (`#f66620`) stays as the accent

Rerurate grammar decisions baked into the stylesheet:

- **Flat surfaces** — no shadows, no blur, no glassmorphism
- **1px rules** — `--rb-rule-width: 1px` and thin scrollbars
- **Typography as graphic** — geometric Latin headings set by size, weight
  and whitespace; sparse ALL CAPS metadata led by a short Orange rule; a
  readable body that stays off the display treatment
- **Multi-colour rule motif** — a short segmented rule split into three
  equal parts (dark red → yellow `#b98430` → muted green) is the sanctioned
  replacement for a gradient. Orange is excluded from the motif. It appears
  in the article header and again as an h2 accent, using only the secondary
  palette as thin rule segments
- **Page-load motion** — a ~460ms composition that draws the header rule,
  lifts the title, and turns the rule into a geometric diagram. There is no
  scroll reveal. Disabled by `prefers-reduced-motion` or the `motion` option
- **CSS-embedded SVG** — the rule motif, a precise vector mark, and the
  blockquote quote chevrons are inline `data:` URIs, so no extra markup is
  added and the graphics stay valid when motion is off
- **Selection** — Orange + Paper per brand (`background: orange; color: paper`)
- **Focus** — a clear Orange `:focus-visible` outline, plus an Ink → Orange
  underline expansion on link hover
- **8px grid** — `--rb-space-*` tokens follow the 8px base unit
- **Futura / Helvetica-family** Latin stacks with system Japanese fallbacks
- Semantic `--rr-*` tokens (`--rr-color-*`, `--rr-space-1..4`,
  `--rr-rule-width`, plus motion and SVG tokens) are also exposed for the
  design layer
- **Orange initial** — a strong Rerurate signature, but never applied
  mechanically to every page (opt in via the `initial` option, which also
  selects a `"small" | "medium" | "large"` size)
- **Heading scale** — a restrained default size for the article title and body
  headings; `largeHeadings` opts into a slightly larger scale
- **Orange article title** — the article title is set in the Orange accent
  (`#f66620`) rather than Ink, so the masthead reads as brand
- **Markdown heading marks** — on by default, `#` … `#####` sit inline before
  h1–h5 so each heading reads as if the marks were typed from the start; they
  take the heading's own size, colour and font (h6 is left unmarked).
  `headingMarks: false` removes them
- **Callouts** — a flat Paper/Ink surface with a 1px rule, an Orange left rule,
  and an ALL CAPS title

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  // ...
  theme: rerurateTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    initial: "large",
    motion: true,
    userCss: [],
  }),
});
```

Relies on the same `ThemeConfig` API as `defaultTheme()`, so it can replace any
other theme without configuration changes. The root-level `data-theme-name`
attribute reports `rerurate`.

## Options

`rerurateTheme(options?)` accepts any `ThemeConfig` field except `name`, plus
the theme-specific `initial`, `largeHeadings`, `headingMarks`, and `motion`
options:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `initial` | `boolean \| "small" \| "medium" \| "large"` | `false` | Render the first letter of the article body's first paragraph as an Orange initial. `true` sizes it `"medium"`. Applied via the `data-rerurate-initial="on"` and `data-rerurate-initial-size="<size>"` attributes |
| `largeHeadings` | `boolean` | `false` | Opt into a slightly larger heading scale for the article title and body headings. `true` sets `data-rerurate-headings="large"` |
| `headingMarks` | `boolean` | `true` | Show markdown-style `#` … `#####` inline before h1–h5, in the heading's own size, colour and font (h6 is unmarked). `false` sets `data-rerurate-heading-marks="off"` |
| `motion` | `boolean` | `true` | Run the page-load composition (rule draw-in, title rise, rule-to-diagram). `false` sets `data-rerurate-motion="off"`, which switches motion off and renders the finished composition immediately |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | Color mode. `system` follows `prefers-color-scheme` unless `data-theme` is set |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | Typography preset, applied via the `data-typography` attribute |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | Article layout preset for consumers that read `data-article-layout` |
| `tokens` | `ThemeDesignTokens` | `{}` | Override design tokens (colors, fonts, spacing, layout widths) |
| `userCss` | `string[]` | `[]` | Extra user stylesheets |

Theme-specific options are applied to the root element as safe `data-*`
attributes (`data-rerurate-initial`, `data-rerurate-initial-size`,
`data-rerurate-headings`, `data-rerurate-heading-marks`,
`data-rerurate-motion`). They can also be overridden directly from `config`,
e.g.
`attributes: { "data-rerurate-initial": "on", "data-rerurate-motion": "off" }`.

See the [`@riebeckite/theme-default`](../default/README.md) README for the
full token list — the token contract is identical. The secondary Red, Yellow
and Green are used only as thin segments of the multi-colour rule motif, and
Red and Green also back the functional `danger` / `success` tokens.

## Exports

- `rerurateTheme(options?)` — theme factory
- Type: `RerurateThemeOptions`
- Styles: `@riebeckite/theme-rerurate/style.css`

## See also

- [Plugin guide](../../../docs/en/reference/plugin-api.md)
- [`@riebeckite/theme-default`](../default/README.md)
- [`@riebeckite/theme-sakura`](../sakura/README.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README.md)
- [`@riebeckite/theme-gruvbox`](../gruvbox/README.md)