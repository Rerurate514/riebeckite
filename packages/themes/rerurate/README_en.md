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
- **Selection** — Orange + Paper per brand (`background: orange; color: paper`)
- **Focus** — a clear Orange `:focus-visible` outline
- **8px grid** — `--rb-space-*` tokens follow the 8px base unit
- **Futura / Helvetica-family** Latin stacks with system Japanese fallbacks
- Semantic `--rr-*` tokens (`--rr-color-paper`, `--rr-color-ink`,
  `--rr-color-orange`, `--rr-space-1..4`, `--rr-rule-width`) are also exposed
  for the design layer
- **Orange initial** — a strong Rerurate signature, but never applied
  mechanically to every page (opt in via the `initial` option)

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
    initial: true,
    userCss: [],
  }),
});
```

Relies on the same `ThemeConfig` API as `defaultTheme()`, so it can replace any
other theme without configuration changes. The root-level `data-theme-name`
attribute reports `rerurate`.

## Options

`rerurateTheme(options?)` accepts any `ThemeConfig` field except `name`, plus
the theme-specific `initial` option:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `initial` | `boolean` | `false` | Render the first letter of the article body's first paragraph as a large Orange initial (applied via the `data-rerurate-initial="on"` attribute) |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | Color mode. `system` follows `prefers-color-scheme` unless `data-theme` is set |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | Typography preset, applied via the `data-typography` attribute |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | Article layout preset for consumers that read `data-article-layout` |
| `tokens` | `ThemeDesignTokens` | `{}` | Override design tokens (colors, fonts, spacing, layout widths) |
| `userCss` | `string[]` | `[]` | Extra user stylesheets |

Theme-specific options are applied to the root element as safe `data-*`
attributes (`data-rerurate-initial`). `initial` can also be overridden directly
from `config` via `attributes: { "data-rerurate-initial": "on" }`.

See the [`@riebeckite/theme-default`](../default/README_en.md) README for the
full token list — the token contract is identical. Red and green are used only
for the functional `danger` / `success` tokens.

## Exports

- `rerurateTheme(options?)` — theme factory
- Type: `RerurateThemeOptions`
- Styles: `@riebeckite/theme-rerurate/style.css`

## See also

- [Plugin guide](../../../docs/plugins_en.md)
- [`@riebeckite/theme-default`](../default/README_en.md)
- [`@riebeckite/theme-sakura`](../sakura/README_en.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README_en.md)
- [`@riebeckite/theme-gruvbox`](../gruvbox/README_en.md)