---
title: Garden
---
# Garden

[日本語](./garden.ja.md)

## Overview

`@riebeckite/theme-garden` provides the official **Garden** theme. Its theme identity is `garden`. A calm reading theme with seasonal botanical details.

## Installation

```sh
npm install @riebeckite/theme-garden
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { gardenTheme } from "@riebeckite/theme-garden";

export default defineConfig({
  theme: gardenTheme({
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
| `accentColor` | color | `"#526b38"` | Rules and interactive accents. |
| `articleWidth` | slider | `46` — 34–60, step 1 | Maximum article width in rem. |
| `fontSize` | slider | `1.0625` — 0.9375–1.25, step 0.0625 | Article text size in rem. |
| `lineHeight` | slider | `1.9` — 1.5–2.1, step 0.05 | Article line height. |
| `motion` | boolean | `true` | Enables theme motion effects. |
| `sprigs` | boolean | `true` | Show the decorative sprigs in headings. |
| `season` | select | `"spring"` — `spring`, `summer`, `autumn`, `winter` | Tint the decorative sprigs with a seasonal palette. |

## Presets

This theme does not define presets.

## CSS and attributes

The root receives `data-rb-theme="garden"`, `data-rb-mode` for an explicit light or dark mode, and `data-rb-layout`. Every setting is reflected as `data-rb-setting-<name>`; color, number, and slider settings are also available as safe `--rb-setting-<name>` custom properties.

## See also

[Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md).
