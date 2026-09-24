# @riebeckite/theme-sakura

A cherry-blossom (sakura) theme for Riebeckite: soft pink paper, plum ink, and
a sakura-pink accent across light and dark color modes.

[日本語](./README_ja.md)

## Overview

`sakuraTheme()` creates a theme named `sakura`. Like the default theme, it
exposes the design system as CSS custom properties (`--rb-color-*`,
`--rb-font-*`, `--rb-space-*`, `--rb-layout-*`) and maps them into Tailwind
theme values in an `@theme` block, so the tokens work both from plain CSS and
from Tailwind-style utilities.

The palette is inspired by cherry blossoms:

- **Light** — blossom-white paper (`#fff8fa`), deep plum ink (`#4a2a3a`), and
  a sakura-pink accent (`#e8789f`)
- **Dark** — deep plum-black paper (`#241520`), pale blossom ink
  (`#f9e4ec`), and a lighter sakura-pink accent (`#f4a3c2`)

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  // ...
  theme: sakuraTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    bloom: "vivid",
    userCss: [],
  }),
});
```

Relies on the same `ThemeConfig` API as `defaultTheme()`, so the two themes can
be swapped without other configuration changes. The root-level
`data-theme-name` attribute reports `sakura`.

## Options

`sakuraTheme(options?)` accepts any `ThemeConfig` field except `name`, plus the
theme-specific `bloom` option:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `bloom` | `"soft" \| "vivid"` | `"soft"` | Accent intensity. `vivid` uses a deeper sakura pink (applied via the `data-sakura-bloom="vivid"` attribute) |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | Color mode. `system` follows `prefers-color-scheme` unless `data-theme` is set |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | Typography preset, applied via the `data-typography` attribute |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | Article layout preset for consumers that read `data-article-layout` |
| `tokens` | `ThemeDesignTokens` | `{}` | Override design tokens (colors, fonts, spacing, layout widths) |
| `userCss` | `string[]` | `[]` | Extra user stylesheets |

Theme-specific options are applied to the root element as safe `data-*`
attributes (`data-sakura-bloom`). `bloom` can also be overridden directly from
`config` via `attributes: { "data-sakura-bloom": "vivid" }`.

See the [`@riebeckite/theme-default`](../default/README_en.md) README for the
full token list — the token contract is identical.

## Exports

- `sakuraTheme(options?)` — theme factory
- Type: `SakuraThemeOptions`
- Styles: `@riebeckite/theme-sakura/style.css`

## See also

- [Plugin guide](../../../docs/plugins_en.md)
- [`@riebeckite/theme-default`](../default/README_en.md)