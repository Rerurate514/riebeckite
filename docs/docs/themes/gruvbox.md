---
title: Gruvbox
---
# Gruvbox

[日本語](./gruvbox.ja.md)

## Overview

`@riebeckite/theme-gruvbox` provides the official **Gruvbox** theme. Its theme identity is `gruvbox`. A warm, high-contrast theme based on the Gruvbox palette.

## Installation

```sh
npm install @riebeckite/theme-gruvbox
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { gruvboxTheme } from "@riebeckite/theme-gruvbox";

export default defineConfig({
  theme: gruvboxTheme({
    colorMode: "system",
    settings: { contrast: "medium" },
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
| `contrast` | select | `"medium"` — `soft`, `medium`, `hard` | Selects the Gruvbox contrast level. |
| `typography` | select | `"system"` — `system`, `serif`, `sans`, `mono` | Selects the article typeface. |
| `accentColor` | color | `"#076678"` | Links, rules, and interactive accents. |
| `articleWidth` | slider | `48` — 36–64, step 1 | Maximum article width in rem. |
| `fontSize` | slider | `1.0625` — 0.9375–1.25, step 0.0625 | Article text size in rem. |
| `lineHeight` | slider | `1.75` — 1.5–2.1, step 0.05 | Article line height. |
| `scanlines` | boolean | `false` | Overlay a subtle CRT scanline pattern on the page. |

## Presets

This theme does not define presets.

## CSS and attributes

The root receives `data-rb-theme="gruvbox"`, `data-rb-mode` for an explicit light or dark mode, and `data-rb-layout`. Every setting is reflected as `data-rb-setting-<name>`; color, number, and slider settings are also available as safe `--rb-setting-<name>` custom properties.

## See also

[Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md).
