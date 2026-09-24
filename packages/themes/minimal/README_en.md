# @riebeckite/theme-minimal

A deliberately plain baseline theme for Riebeckite: monochrome paper/ink, no
decorative base styling. Use it as a reference implementation of every theme
authoring rule, or as a blank canvas for your own theme.

[日本語](./README_ja.md)

## Overview

`minimalTheme()` creates a theme named `minimal`. It is the smallest valid
Theme that still follows the [theme authoring contract](../../../docs/theme_authoring_en.md):
it exposes the full set of `--rb-*` semantic tokens, maps them into an
`@theme` block, and only touches token values — no `data-*` attributes, no
custom base rules beyond `html`/`body`/`::selection`/`:focus-visible`.

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

See the [`@riebeckite/theme-default`](../default/README_en.md) README for the
full token list — the token contract is identical.

## Exports

- `minimalTheme(options?)` — theme factory
- Type: `MinimalThemeOptions`
- Styles: `@riebeckite/theme-minimal/style.css`

## See also

- [Theme authoring contract](../../../docs/theme_authoring_en.md)
- [`@riebeckite/theme-default`](../default/README_en.md)
- [`@riebeckite/theme-sakura`](../sakura/README_en.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README_en.md)
- [`@riebeckite/theme-gruvbox`](../gruvbox/README_en.md)
- [`@riebeckite/theme-rerurate`](../rerurate/README_en.md)