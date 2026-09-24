# @riebeckite/theme-tokyonight

An assertive Tokyo Night theme for Riebeckite: high-contrast twilight day mode
and the classic deep-indigo night mode, with an electric-blue accent and
magenta/neon flourishes.

[日本語](./README_ja.md)

## Overview

`tokyonightTheme()` creates a theme named `tokyonight`, following the same
`ThemeConfig` API and token contract as the other Riebeckite themes. Design
tokens are exposed as CSS custom properties (`--rb-color-*`, `--rb-font-*`,
`--rb-space-*`, `--rb-layout-*`) and mapped into Tailwind theme values in an
`@theme` block.

Compared with the subtler default theme, Tokyo Night dials up the contrast:

- **Light ("day")** — twilight-white paper (`#e1e2e7`) with a deep indigo ink
  (`#343b58`) and an electric-blue accent (`#2e7de9`)
- **Dark ("night")** — the classic Tokyo Night background `#1a1b26` with pale
  fuji-blue ink (`#c0caf5`) and a glowing `#7aa2f7` accent

Beyond the tokens it also applies assertive base styling: an accent-color
`caret`/`accent-color`, an electric `:focus-visible` outline, neon-tinted
`::selection`, and a slim accent-tinted scrollbar.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { tokyonightTheme } from "@riebeckite/theme-tokyonight";

export default defineConfig({
  // ...
  theme: tokyonightTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    neon: true,
    userCss: [],
  }),
});
```

Relies on the same `ThemeConfig` API as `defaultTheme()`, so it can replace
either theme without other configuration changes. The root-level
`data-theme-name` attribute reports `tokyonight`.

## Options

`tokyonightTheme(options?)` accepts any `ThemeConfig` field except `name`, plus
the theme-specific `neon` option:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `neon` | `boolean` | `false` | Neon flourish (applied via the `data-tokyonight-neon="on"` attribute): glowing accent `:focus-visible` outline, `::selection`, and accent-tinted scrollbar |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | Color mode. `system` follows `prefers-color-scheme` unless `data-theme` is set |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | Typography preset, applied via the `data-typography` attribute |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | Article layout preset for consumers that read `data-article-layout` |
| `tokens` | `ThemeDesignTokens` | `{}` | Override design tokens (colors, fonts, spacing, layout widths) |
| `userCss` | `string[]` | `[]` | Extra user stylesheets |

Theme-specific options are applied to the root element as safe `data-*`
attributes (`data-tokyonight-neon`). `neon` can also be overridden directly
from `config` via `attributes: { "data-tokyonight-neon": "on" }`.

See the [`@riebeckite/theme-default`](../default/README_en.md) README for the
full token list — the token contract is identical.

## Exports

- `tokyonightTheme(options?)` — theme factory
- Type: `TokyonightThemeOptions`
- Styles: `@riebeckite/theme-tokyonight/style.css`

## See also

- [Plugin guide](../../../docs/plugins_en.md)
- [`@riebeckite/theme-default`](../default/README_en.md)
- [`@riebeckite/theme-sakura`](../sakura/README_en.md)