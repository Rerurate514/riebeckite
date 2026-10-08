# Sakura

A cherry-blossom (sakura) theme for Riebeckite: soft pink paper, plum ink, a
sakura-pink accent, and a warm serif editorial voice.

[日本語](./sakura.ja.md)

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

Beyond the palette, `sakura` is a soft, warm editorial theme rather than a
plain sans skin:

- **Serif body and headings** — Latin text uses the self-hosted variable
  **Source Serif 4**, with CJK serif fallbacks (`Hiragino Mincho ProN`,
  `Yu Mincho`, `Noto Serif JP`) and a comfortable `1.9` line-height.
- **Rounded, quiet surfaces** — code blocks, callouts, tables, blockquotes,
  and cards share a generous corner radius (`roundness: "soft"`), while soft
  shadows are reserved for genuinely elevated elements such as images.
- **Restrained blossom accents** — links, list markers, blockquote rules,
  callouts, and a short rule under `h2` headings pick up the sakura accent,
  kept legible in both color modes.
- **Decorated or plain headings** — the `heading` option toggles the `h2`
  blossom rule.

All character styling is scoped to the theme root and layered so the theme can
be swapped without touching the application CSS.

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
    roundness: "soft",
    heading: "decorated",
    userCss: [],
  }),
});
```

Relies on the same `ThemeConfig` API as `defaultTheme()`, so the two themes can
be swapped without other configuration changes. The root-level
`data-theme-name` attribute reports `sakura`.

## Options

`sakuraTheme(options?)` accepts any `ThemeConfig` field except `name`, plus the
theme-specific `bloom`, `roundness`, and `heading` options:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `bloom` | `"soft" \| "vivid"` | `"soft"` | Accent intensity. `vivid` uses a deeper sakura pink (applied via the `data-sakura-bloom="vivid"` attribute) |
| `roundness` | `"soft" \| "crisp"` | `"soft"` | Surface corner radius. `soft` uses generous radii (~10px); `crisp` uses a small radius (~2px). Applied via `data-sakura-roundness` |
| `heading` | `"decorated" \| "plain"` | `"decorated"` | Heading decoration. `decorated` adds a short accent rule under `h2`; `plain` leaves headings bare. Applied via `data-sakura-heading` |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | Color mode. `system` follows `prefers-color-scheme` unless `data-theme` is set |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | Typography preset, applied via the `data-typography` attribute. The default is serif; `sans` switches the body back to a CJK-aware sans stack |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | Article layout preset for consumers that read `data-article-layout` |
| `tokens` | `ThemeDesignTokens` | `{}` | Override design tokens (colors, fonts, spacing, layout widths) |
| `userCss` | `string[]` | `[]` | Extra user stylesheets |

Theme-specific options are applied to the root element as safe `data-*`
attributes (`data-sakura-bloom`, `data-sakura-roundness`,
`data-sakura-heading`). They can also be overridden directly from `config`, for
example `attributes: { "data-sakura-roundness": "crisp" }`.

## Fonts

The Latin subset of [Source Serif 4](https://github.com/adobe-fonts/source-serif)
is vendored under `styles/fonts/source-serif-4-latin-wght-normal.woff2` and
loaded with `font-display: swap` and a Latin `unicode-range`. Japanese glyphs
are not in that subset, so CJK text falls back to the system serif stack
(`Hiragino Mincho ProN`, `Yu Mincho`, `Noto Serif JP`). The font is licensed
under the SIL Open Font License 1.1 (see
`styles/fonts/source-serif-4-LICENSE.txt`); it is self-hosted, so no network
request is made.

See the [`@riebeckite/theme-default`](./default.md) README for the
full token list — the token contract is identical.

## Exports

- `sakuraTheme(options?)` — theme factory
- Type: `SakuraThemeOptions`
- Styles: `@riebeckite/theme-sakura/style.css`

## See also

- [Plugin guide](../../../docs/docs/reference/plugin-api.md)
- [`@riebeckite/theme-default`](./default.md)

## Documentation site

An editorial Theme inspired by cherry blossoms.

## Installation

```bash
npm install @riebeckite/theme-sakura
```

Check the implementation and this canonical page as the source of truth for the Theme's factory name and configuration options. Use it by assigning it to `theme` in `riebeckite.config.ts`.

## Detailed specification

For configuration options and Theme-specific behavior, see this canonical page. For how Themes work, see [Theme System](../framework/theme-system.md). To create a Theme, see [Writing a Theme](./writing-a-theme.md).
