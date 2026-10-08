# @riebeckite/theme-tokyonight

<!-- Generated from docs/docs/themes/tokyonight.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

An assertive Tokyo Night theme for Riebeckite: high-contrast twilight day mode
and the classic deep-indigo night mode, rebuilt as a technical "developer tool"
look — mono display headings, a tight rhythm, square hairline-bordered surfaces,
an electric-blue accent, and an optional neon glow.

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

Beyond the palette it carries a distinct visual character rather than being a
color swap: uppercase mono headings with accent rules, square corners and 1px
borders, chunky bordered code, hairline tables, underline-on-hover links, and
flat shadow-free chrome. Latin text uses a self-hosted JetBrains Mono for
headings and `--rb-font-mono`; Japanese glyphs fall back to the system stack and
body copy stays sans.

It also applies assertive base styling: an accent-color `caret`/`accent-color`,
an electric `:focus-visible` outline, neon-tinted `::selection`, and a slim
accent-tinted scrollbar.

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
    density: "cozy",
    heading: "tech",
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
the theme-specific `density`, `heading`, and `neon` options:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `density` | `"cozy" \| "compact"` | `"cozy"` | Vertical rhythm (applied via `data-tokyonight-density`). `compact` tightens the `--rb-space-*` scale and heading, paragraph, and list spacing throughout |
| `heading` | `"tech" \| "plain"` | `"tech"` | Heading treatment (applied via `data-tokyonight-heading`). `tech` = uppercase mono headings with accent bars; `plain` = normal-case, undecorated headings in the body font |
| `neon` | `boolean` | `false` | Neon flourish (applied via `data-tokyonight-neon="on"`): glowing accent `:focus-visible` outline, `::selection`, scrollbar, link hover, and heading accents |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | Color mode. `system` follows `prefers-color-scheme` unless `data-theme` is set |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | Typography preset, applied via the `data-typography` attribute |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | Article layout preset for consumers that read `data-article-layout` |
| `tokens` | `ThemeDesignTokens` | `{}` | Override design tokens (colors, fonts, spacing, layout widths) |
| `userCss` | `string[]` | `[]` | Extra user stylesheets |

Theme-specific options are applied to the root element as safe `data-*`
attributes (`data-tokyonight-density`, `data-tokyonight-heading`,
`data-tokyonight-neon`). `neon` can also be overridden directly from `config`
via `attributes: { "data-tokyonight-neon": "on" }`.

See the [`@riebeckite/theme-default`](../default/README.md) README for the
full token list — the token contract is identical.

## Fonts

The Latin subset of [JetBrains Mono](https://www.jetbrains.com/lp/mono/) is
self-hosted (no network request) and vendored under `styles/fonts/` together
with its SIL Open Font License (`jetbrains-mono-LICENSE.txt`). It is used for
mono text and, with `heading: "tech"`, for display headings; CJK glyphs fall
back to the system font stack.

## Exports

- `tokyonightTheme(options?)` — theme factory
- Type: `TokyonightThemeOptions`
- Styles: `@riebeckite/theme-tokyonight/style.css`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [`@riebeckite/theme-default`](../default/README.md)
- [`@riebeckite/theme-sakura`](../sakura/README.md)

## Documentation site

A high-contrast Theme inspired by Tokyo Night.

## Installation

```bash
npm install @riebeckite/theme-tokyonight
```

Check the implementation and this canonical page as the source of truth for the Theme's factory name and configuration options. Use it by assigning it to `theme` in `riebeckite.config.ts`.

## Detailed specification

For configuration options and Theme-specific behavior, see this canonical page. For how Themes work, see [Theme System](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/framework/theme-system.md). To create a Theme, see [Writing a Theme](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.md).
