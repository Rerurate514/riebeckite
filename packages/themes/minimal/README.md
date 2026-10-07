# @riebeckite/theme-minimal

A content-first, near-chromeless typographic theme for Riebeckite: "nothing but
type and space". Monochrome paper/ink, system fonts only, no bundled fonts and
no JavaScript.

[日本語](./README_ja.md)

## Overview

`minimalTheme()` creates a theme named `minimal`. Under the hood it exposes
the full set of `--rb-*` semantic tokens and maps them into an `@theme` block,
then layers a typographic character on top of the stable structural hooks
(`.rb-article-*`, `.rb-sidebar`) and the plugin roots (`rr-*`) — all
scoped to `[data-theme-name="minimal"]` and kept outside `@layer base`.

It is a Riebeckite-native implementation of the design principles behind
[Minimal for Obsidian](https://github.com/kepano/obsidian-minimal): content
first, a quiet interface, strong typography, restrained accent, and dense but
readable chrome. Those ideas are translated into Riebeckite semantic tokens and
stable hooks. It does not imitate the Obsidian desktop app and assumes no
Obsidian variables or DOM.

The character is restraint:

- **A close measure.** The article column is tightened to `43rem` so lines
  stay comfortably readable without growing the page chrome.
- **Type first.** Headings are differentiated by size, weight and tracking —
  not colour, rules or boxes. Body text runs at a generous line-height with
  open paragraph spacing.
- **Hairlines over fills.** Blockquotes, code, tables, the article meta/footer
  and plugin roots use 1px borders and transparent or barely-there surfaces
  instead of cards, fills or shadows. Corners are square.
- **Near-chromeless colour.** The only accent is ink itself; links are ink with
  a quiet underline that firms up on hover. Accent is limited to links, the
  focus/active state and selection.

It replaces `defaultTheme()` without configuration changes and reports
`data-theme-name="minimal"` on the root.

## Installation

```sh
pnpm add @riebeckite/theme-minimal
```

The package depends on `@riebeckite/core` and ships as CSS only — no runtime
code and no bundled font files.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  // ...
  theme: minimalTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    userCss: [],
  }),
});
```

Uses the same `ThemeConfig` API as `defaultTheme()`, so it can replace any
other theme without configuration changes. The root-level `data-theme-name`
attribute reports `minimal`.

## Options

`minimalTheme(options?)` accepts any `ThemeConfig` field except `name`:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | Color mode. `system` follows `prefers-color-scheme` unless `data-theme` is set |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | Typography preset, applied via the `data-typography` attribute |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | Article layout preset for consumers that read `data-article-layout` |
| `tokens` | `ThemeDesignTokens` | `{}` | Override design tokens (colors, fonts, spacing, layout widths) |
| `userCss` | `string[]` | `[]` | Extra user stylesheets |

See the [`@riebeckite/theme-default`](../default/README.md) README for the
full token list. Colors, fonts, spacing, layout widths, and rule widths use the
same tokens in every theme; corner radius is written directly in each theme's
CSS instead of being exposed as a token.

## Light and dark

The palette is deliberately neutral rather than tinted.

- **Light** — a near-white reading surface (`#ffffff`), a subtly
  differentiated secondary surface (`#f7f7f7` / `#ececec`), a dark neutral ink
  (`#1a1a1a`), softer muted text (`#6b6b6b`), low-contrast hairlines, and ink
  as the restrained accent.
- **Dark** — a neutral dark surface (`#1a1a1a`) with slightly lifted secondary
  surfaces (`#242424` / `#2e2e2e`), soft off-white text (`#e5e5e5`), restrained
  muted text (`#9e9e9e`), subtle separators, and the same ink-as-accent
  treatment. There is no pure black, glow or oversaturated accent.

`colorMode: "system"` leaves `data-theme` unset so the OS preference decides;
setting `"light"` or `"dark"` writes the matching `data-theme` value. Links,
focus rings, active controls and selection all use the same accent (ink) so
they stay clearly visible and AA-contrast in both modes.

## Background contrast variants

Upstream Minimal ships background-contrast variants (default, low contrast,
high contrast, true black). The Riebeckite Theme API has no variant concept
today, so this theme ships its normal appearance as the default and expresses
the surface hierarchy through semantic tokens (`--rb-color-paper`,
`--rb-color-surface`, `--rb-color-surface-hover`,
`--rb-color-code-background`). The `tokens` option can already remap those per
site. Background-contrast variants are a possible future Theme API extension
rather than something the theme fakes with extra attributes.

## Exports

- `minimalTheme(options?)` — theme factory
- Type: `MinimalThemeOptions`
- Styles: `@riebeckite/theme-minimal/style.css`

## Attribution

Riebeckite theme based on the design principles of Minimal for Obsidian by Steph Ango (kepano).

- Upstream: <https://github.com/kepano/obsidian-minimal>
- Upstream license: MIT

This is an independent Riebeckite implementation of those design ideas, built
from Riebeckite semantic tokens and stable hooks. It is not the official
Obsidian Minimal distribution and does not emulate the Obsidian desktop app. It
is distributed here under the license stated in the package `LICENSE` file.

## See also

- [Theme authoring contract](../../../docs/docs/reference/theme-api.md)
- [`@riebeckite/theme-default`](../default/README.md)
- [`@riebeckite/theme-sakura`](../sakura/README.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README.md)
- [`@riebeckite/theme-gruvbox`](../gruvbox/README.md)
- [`@riebeckite/theme-rerurate`](../rerurate/README.md)

