# @riebeckite/theme-gruvbox

A warm, retro-groove Gruvbox theme for Riebeckite: buttery-cream paper with ink
tints in light mode, rich charcoal with ebdbb2-toned ink in dark mode, and a
signature burnt-orange accent throughout.

[日本語](./README_ja.md)

## Overview

`gruvboxTheme()` creates a theme named `gruvbox`, following the same
`ThemeConfig` API and token contract as the other Riebeckite themes. Design
tokens are exposed as CSS custom properties (`--rb-color-*`, `--rb-font-*`,
`--rb-space-*`, `--rb-layout-*`) and mapped into Tailwind theme values in an
`@theme` block.

The palette is built from the classic Gruvbox retro-groove colors:

- **Light** — buttery-cream paper (`#fbf1c7`), warm charcoal ink (`#282828`),
  and a burnt-orange accent (`#d65d0e`)
- **Dark** — rich charcoal paper (`#282828`), pale `#ebdbb2` fg ink, and a
  bright orange accent (`#fe8019`)

Like the Tokyo Night theme it adds assertive base styling: an accent
`caret-color`/`accent-color`, a burnt-orange `:focus-visible` outline,
matching `::selection`, and a slim accent-tinted scrollbar.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { gruvboxTheme } from "@riebeckite/theme-gruvbox";

export default defineConfig({
  // ...
  theme: gruvboxTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    contrast: "hard",
    userCss: [],
  }),
});
```

Relies on the same `ThemeConfig` API as `defaultTheme()`, so it can replace any
other theme without configuration changes. The root-level `data-theme-name`
attribute reports `gruvbox`.

## Options

`gruvboxTheme(options?)` accepts any `ThemeConfig` field except `name`, plus
the theme-specific `contrast` option:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `contrast` | `"soft" \| "medium" \| "hard"` | `"medium"` | The classic Gruvbox contrast level (applied via the `data-gruvbox-contrast` attribute), adjusting paper/surface lightness in both light and dark modes |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | Color mode. `system` follows `prefers-color-scheme` unless `data-theme` is set |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | Typography preset, applied via the `data-typography` attribute |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | Article layout preset for consumers that read `data-article-layout` |
| `tokens` | `ThemeDesignTokens` | `{}` | Override design tokens (colors, fonts, spacing, layout widths) |
| `userCss` | `string[]` | `[]` | Extra user stylesheets |

Theme-specific options are applied to the root element as safe `data-*`
attributes (`data-gruvbox-contrast`). `contrast` can also be overridden
directly from `config` via
`attributes: { "data-gruvbox-contrast": "hard" }`.

See the [`@riebeckite/theme-default`](../default/README_en.md) README for the
full token list — the token contract is identical.

## Exports

- `gruvboxTheme(options?)` — theme factory
- Type: `GruvboxThemeOptions`
- Styles: `@riebeckite/theme-gruvbox/style.css`

## See also

- [Plugin guide](../../../docs/plugins_en.md)
- [`@riebeckite/theme-default`](../default/README_en.md)
- [`@riebeckite/theme-sakura`](../sakura/README_en.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README_en.md)