---
title: Default
---
# Default

[日本語](./default.ja.md)

## Overview

`@riebeckite/theme-default` provides the official **Default** theme. Its theme identity is `riebeckite`. A balanced reading surface for documentation and long-form writing.

## Installation

```sh
npm install @riebeckite/theme-default
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  theme: defaultTheme({
    colorMode: "system",
    preset: "reading",
    settings: { typography: "system" },
  }),
});
```

## Common options

| Property | Values | Description |
| --- | --- | --- |
| `colorMode` | `"light"`, `"dark"`, `"system"` | Chooses the color mode. `"system"` follows the browser preference. |
| `layout` | `"article"`, `"sidebar"`, `"full-width"` | Chooses the page layout. |
| `preset` | `reading` | Applies a named set of theme settings before explicit `settings`. |
| `settings` | object | Overrides the settings listed below. Unknown keys and invalid values are rejected. |
| `stylesheets` | string array | Loads site-owned stylesheets after the theme CSS. |

Resolution order is schema defaults, then the selected preset, then explicit `settings`.

## Theme settings

| Property | Type | Default and allowed values | Effect |
| --- | --- | --- | --- |
| `typography` | select | `"system"` — `system`, `serif`, `sans`, `mono` | Selects the article typeface. |
| `accentColor` | color | `"#075fc9"` | Interactive accents for controls. |
| `articleWidth` | slider | `46` — 36–56, step 1 | Maximum article width in rem. |
| `fontSize` | slider | `1.0625` — 0.9375–1.25, step 0.0625 | Article text size in rem. |
| `lineHeight` | slider | `1.8` — 1.5–2.1, step 0.05 | Article line height. |

## Presets

| Preset | Label | Applied settings |
| --- | --- | --- |
| `reading` | Reading | `{ typography: "serif", articleWidth: 44 }` |

## CSS and attributes

The root receives `data-rb-theme="riebeckite"`, `data-rb-mode` for an explicit light or dark mode, and `data-rb-layout`. Every setting is reflected as `data-rb-setting-<name>`; color, number, and slider settings are also available as safe `--rb-setting-<name>` custom properties.

## See also

[Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md).
