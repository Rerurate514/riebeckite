# @riebeckite/theme-default

The default Riebeckite theme: design tokens, light/dark color modes, typography
presets, and article layout shipped as CSS.

[日本語](./README_ja.md)

## Overview

`defaultTheme()` creates the built-in theme named `riebeckite`. It exposes the
design system as CSS custom properties (`--rb-color-*`, `--rb-font-*`,
`--rb-space-*`, `--rb-layout-*`) and maps them into Tailwind theme values in an
`@theme` block, so the tokens are usable both from plain CSS and from
Tailwind-style utilities.

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

- **Colors** — `--rb-color-paper`, `-ink`, `-muted`, `-accent`, `-border`,
  `-border-strong`, `-surface`, `-surface-hover`, `-overlay`, `-danger`,
  `-success`, `-code-background` in light, dark, and `prefers-color-scheme`
  variants
- **Typography** — `--rb-font-body`, `--rb-font-heading`, `--rb-font-mono`;
  the `serif`/`sans` presets swap body/heading fonts via
  `:root[data-typography=...]`
- **Spacing & layout** — `--rb-space-1..8`, `--rb-rule-width`,
  `--rb-layout-page-max`, `--rb-layout-article-max`, `--rb-layout-sidebar`,
  `--rb-layout-gap`

Set `data-theme="dark"` (or `"light"`) on the root element to force a color
mode; leave it unset to follow the OS with `colorMode: "system"`.

## Exports

- `defaultTheme(options?)` — theme factory
- Type: `DefaultThemeOptions`
- Styles: `@riebeckite/theme-default/style.css`

## See also

- [Plugin guide](../../../docs/plugins_en.md)