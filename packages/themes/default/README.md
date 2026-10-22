# @riebeckite/theme-default

<!-- Generated from docs/docs/themes/default.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

The default Riebeckite theme: design tokens, light/dark color modes, typography
presets, and article layout shipped as CSS.

[日本語](./README_ja.md)

## Overview

`defaultTheme()` creates the built-in theme named `riebeckite`. It exposes the
design system as CSS custom properties (`--rb-color-*`, `--rb-font-*`,
`--rb-space-*`, `--rb-layout-*`) and maps them into Tailwind theme values in an
`@theme` block, so the tokens are usable both from plain CSS and from
Tailwind-style utilities.

It is also the reference theme in character: a calm neutral reading surface
with Riebeckite Blue used deliberately for actions, links, focus, selection,
and active states. Its typography prioritizes long-form reading in Latin and
Japanese, while code uses a deeper technical surface for clear separation.
Article hierarchy comes from type, spacing, and restrained rules rather than
decorative cards or effects. The stylesheet is scoped to the theme root and
does not target plugin-internal selectors; plugins inherit the shared semantic
tokens that they expose as their public styling contract.

The theme is used automatically when `config.theme` is omitted from
`riebeckite.config.ts`.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  // ...
  theme: defaultTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    userCss: [],
  }),
});
```

## Options

`defaultTheme(options?)` accepts any `ThemeConfig` field except `name`:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | Color mode. `system` follows `prefers-color-scheme` unless `data-theme` is set |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | Typography preset, applied via the `data-typography` attribute |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | Article layout preset for consumers that read `data-article-layout` |
| `tokens` | `ThemeDesignTokens` | `{}` | Override design tokens (colors, fonts, spacing, layout widths) |
| `userCss` | `string[]` | `[]` | Extra user stylesheets |

## Design tokens

The stylesheet defines custom properties that override-driven and consumed
throughout Riebeckite:

- **Colors** — `--rb-color-paper`, `-ink`, `-muted`, `-accent`, `-link`,
  `-focus`, `-selected`, `-border`, `-border-strong`, `-surface`,
  `-surface-hover`, `-overlay`, `-danger`, `-success`, `-code-background`,
  `-code-ink`, and `-code-inline` in light, dark, and
  `prefers-color-scheme` variants
- **Typography** — `--rb-font-body`, `--rb-font-heading`, `--rb-font-mono`;
  the `serif`/`sans` presets swap body/heading fonts via
  `:root[data-typography=...]`
- **Spacing, shape & layout** — `--rb-space-1..8`, `--rb-rule-width`,
  `--rb-radius-sm`, `--rb-radius-md`, `--rb-control-*`, `--rb-motion-*`,
  `--rb-layout-page-max`, `--rb-layout-article-max`, `--rb-layout-sidebar`,
  and `--rb-layout-gap`

Set `data-theme="dark"` (or `"light"`) on the root element to force a color
mode; leave it unset to follow the OS with `colorMode: "system"`.

## Exports

- `defaultTheme(options?)` — theme factory
- Type: `DefaultThemeOptions`
- Styles: `@riebeckite/theme-default/style.css`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)

## Documentation site

The standard Riebeckite Theme. It provides the baseline look for article reading and site UI.

## Installation

```bash
npm install @riebeckite/theme-default
```

Check the implementation and this canonical page as the source of truth for the Theme's factory name and configuration options. Use it by assigning it to `theme` in `riebeckite.config.ts`.

## Detailed specification

For configuration options and Theme-specific behavior, see this canonical page. For how Themes work, see [Theme System](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/framework/theme-system.md). To create a Theme, see [Writing a Theme](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.md).
