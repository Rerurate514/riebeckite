# @riebeckite/theme-gruvbox

A warm, retro-groove Gruvbox theme for Riebeckite: buttery-cream paper with
warm-charcoal ink in light mode, rich charcoal with `#ebdbb2` ink in dark mode,
and the classic Gruvbox blue as the interactive accent.

[日本語](./README_ja.md)

## Overview

`gruvboxTheme()` creates a theme named `gruvbox`, following the same
`ThemeConfig` API and token contract as the other Riebeckite themes. Design
tokens are exposed as CSS custom properties (`--rb-color-*`, `--rb-font-*`,
`--rb-space-*`, `--rb-layout-*`) and mapped into Tailwind theme values in an
`@theme` block.

Beyond the palette it carries a distinct visual character rather than being a
color swap: warm ink headings with a quiet 1px rule under `h2`, blue
underline-on-hover links, a flat gray-ruled blockquote, hairline-bordered
tables with a tinted header row, and flat 1px-bordered plugin surfaces with
small 2px corners. Corners stay small, there are no gradients or shadows, and
motion is left to the framework. Body copy sits at a comfortable reading rhythm
with low-glare surfaces throughout.

It also applies assertive base styling: an accent `caret-color`/
`accent-color`, a Gruvbox orange/yellow `:focus-visible` outline, matching
`::selection`, and a slim accent-tinted scrollbar.

The palette uses the original Gruvbox values (see [Attribution](#attribution)).

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

## Dark and light

- **Light** — `bg0` paper, `dark1`-ish ink, and the dark Gruvbox accent
  variants (e.g. paper `#fbf1c7`, ink `#3c3836`, accent `#076678`)
- **Dark** — `bg0` paper, `light1` ink, and the bright Gruvbox accent variants
  (e.g. paper `#282828`, ink `#ebdbb2`, accent `#83a598`)

`colorMode: "system"` follows `prefers-color-scheme` unless a `data-theme`
attribute is present. Both modes share the same semantic accent roles; only the
bright/dark Gruvbox color variants change.

`contrast` maps to the classic Gruvbox `bg0` level for the page paper:

- dark: `soft` = `dark0_soft`, `medium` = `dark0`, `hard` = `dark0_hard`
- light: `soft` = `light0_soft`, `medium` = `light0`, `hard` = `light0_hard`

## Palette mapping

| Semantic token | Light | Dark |
| -------------- | ----- | ---- |
| `--rb-color-paper` | `#fbf1c7` (light0) | `#282828` (dark0) |
| `--rb-color-surface` | `#f2e5bc` (light0_soft) | `#32302f` (dark0_soft) |
| `--rb-color-surface-hover` | `#ebdbb2` (light1) | `#3c3836` (dark1) |
| `--rb-color-ink` | `#3c3836` (dark1) | `#ebdbb2` (light1) |
| `--rb-color-muted` | `#665c54` (dark3) | `#a89984` (light4) |
| `--rb-color-accent` | `#076678` (faded_blue) | `#83a598` (bright_blue) |
| `--rb-color-border` | `#d5c4a1` (light2) | `#504945` (dark2) |
| `--rb-color-border-strong` | `#bdae93` (light3) | `#665c54` (dark3) |
| `--rb-color-danger` | `#9d0006` (faded_red) | `#fb4934` (bright_red) |
| `--rb-color-success` | `#79740e` (faded_green) | `#b8bb26` (bright_green) |
| `--rb-color-code-background` | `#f2e5bc` (light0_soft) | `#1d2021` (dark0_hard) |

Contrast-driven deviations from the canonical pairing, keeping the Gruvbox
palette:

- **Light links/accent** use `faded_blue #076678` instead of
  `neutral_blue #458588` (`#458588` is only ~3.7:1 on `#fbf1c7`, below WCAG AA;
  `#076678` is ~5.8:1).
- **Light muted text** uses `dark3 #665c54` instead of `dark4 #7c6f64`
  (`#7c6f64` is ~4.3:1; `#665c54` is ~5.2:1 or better).
- **Focus outline** is Gruvbox orange/yellow (`#af3a03` light, `#fabd2f`
  dark) so it is visible against the paper in both modes.

## Options

`gruvboxTheme(options?)` accepts any `ThemeConfig` field except `name`, plus
the theme-specific `contrast` option:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `contrast` | `"soft" \| "medium" \| "hard"` | `"medium"` | The classic Gruvbox contrast level (applied via the `data-gruvbox-contrast` attribute), selecting `dark0_soft`/`dark0`/`dark0_hard` (or `light0_soft`/`light0`/`light0_hard`) as the page paper |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | Color mode. `system` follows `prefers-color-scheme` unless `data-theme` is set |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | Typography preset, applied via the `data-typography` attribute |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | Article layout preset for consumers that read `data-article-layout` |
| `tokens` | `ThemeDesignTokens` | `{}` | Override design tokens (colors, fonts, spacing, layout widths) |
| `userCss` | `string[]` | `[]` | Extra user stylesheets |

Theme-specific options are applied to the root element as safe `data-*`
attributes (`data-gruvbox-contrast`). `contrast` can also be overridden
directly from `config` via
`attributes: { "data-gruvbox-contrast": "hard" }`.

See the [`@riebeckite/theme-default`](../default/README.md) README for the
full token list — the token contract is identical.

## Exports

- `gruvboxTheme(options?)` — theme factory
- Type: `GruvboxThemeOptions`
- Styles: `@riebeckite/theme-gruvbox/style.css`

## Attribution

Riebeckite theme based on the Gruvbox color scheme by Pavel Pertsev.

- Upstream: <https://github.com/morhetz/gruvbox>
- Upstream license: MIT/X11

This package is an independent Riebeckite theme, not the original Gruvbox
project, and is distributed here under the license stated in the package
`LICENSE` file.

## See also

- [Plugin guide](../../../docs/en/plugin-system.md)
- [`@riebeckite/theme-default`](../default/README.md)
- [`@riebeckite/theme-sakura`](../sakura/README.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README.md)
