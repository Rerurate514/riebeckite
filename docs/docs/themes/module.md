---
title: Module
---
# Module

[日本語](./module.ja.md)

## Overview

`@riebeckite/theme-module` provides the official **Module** theme. Its theme identity is `module`. A structured technical theme with calibrated grids and edge details.

## Installation

```sh
npm install @riebeckite/theme-module
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { moduleTheme } from "@riebeckite/theme-module";

export default defineConfig({
  theme: moduleTheme({
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
| `accentColor` | color | `"#a94e08"` | Warm accent for controls and structural details. |
| `articleWidth` | slider | `50` — 40–68, step 1 | Maximum article width in rem. |
| `fontSize` | slider | `1` — 0.9375–1.25, step 0.0625 | Article text size in rem. |
| `lineHeight` | slider | `1.75` — 1.5–2.1, step 0.05 | Article line height. |
| `blueprint` | boolean | `true` | Show the calibrated grid behind the reading surface. |
| `glow` | boolean | `true` | Illuminate the article frame with the accent color. |
| `flourish` | boolean | `false` | Show a subtle SVG flourish in the article header. |

## Presets

This theme does not define presets.

## CSS and attributes

The root receives `data-rb-theme="module"`, `data-rb-mode` for an explicit light or dark mode, and `data-rb-layout`. Every setting is reflected as `data-rb-setting-<name>`; color, number, and slider settings are also available as safe `--rb-setting-<name>` custom properties.

## See also

[Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md).
