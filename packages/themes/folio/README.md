# @riebeckite/theme-folio

<!-- Generated from docs/docs/themes/folio.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

[日本語](./README_ja.md)

## Overview

`@riebeckite/theme-folio` provides the official **Folio** theme. Its theme identity is `folio`. A spacious portfolio-style theme with editorial framing.

## Installation

```sh
npm install @riebeckite/theme-folio
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { folioTheme } from "@riebeckite/theme-folio";

export default defineConfig({
  theme: folioTheme({
    colorMode: "system",
    settings: { typography: "system" },
  }),
});
```

## Common options

| Property | Values | Description |
| --- | --- | --- |
| `colorMode` | `"light"`, `"dark"`, `"system"` | Chooses the color mode. `"system"` follows the browser preference. |
| `layout` | `"article"`, `"sidebar"`, `"full-width"` | Chooses the page layout. |
| `preset` | — | This theme does not define presets. |
| `settings` | object | Overrides the settings listed below. Unknown keys and invalid values are rejected. |
| `stylesheets` | string array | Loads site-owned stylesheets after the theme CSS. |

Resolution order is schema defaults, then the selected preset, then explicit `settings`.

## Theme settings

| Property | Type | Default and allowed values | Effect |
| --- | --- | --- | --- |
| `typography` | select | `"system"` — `system`, `serif`, `sans`, `mono` | Selects the article typeface. |
| `accentColor` | color | `"#d6422c"` | Rules and interactive accents. |
| `articleWidth` | slider | `62` — 44–76, step 1 | Maximum article width in rem. |
| `fontSize` | slider | `1.05` — 0.95–1.25, step 0.05 | Article text size in rem. |
| `lineHeight` | slider | `1.65` — 1.5–2.1, step 0.05 | Article line height. |
| `motion` | boolean | `true` | Enables theme motion effects. |
| `ornament` | boolean | `true` | Show the corner mark in the article header. |
| `seal` | boolean | `false` | Add a circular folio stamp to the article header. |

## Presets

This theme does not define presets.

## CSS and attributes

The root receives `data-rb-theme="folio"`, `data-rb-mode` for an explicit light or dark mode, and `data-rb-layout`. Every setting is reflected as `data-rb-setting-<name>`; color, number, and slider settings are also available as safe `--rb-setting-<name>` custom properties.

## See also

[Theme API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md) and [Writing a theme](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.md).
