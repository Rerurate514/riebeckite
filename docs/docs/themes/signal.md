---
title: Signal
---
# Signal

[日本語](./signal.ja.md)

## Overview

`@riebeckite/theme-signal` provides the official **Signal** theme. Its theme identity is `signal`. A bold graphic theme for editorial and poster-like reading surfaces.

## Installation

```sh
npm install @riebeckite/theme-signal
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { signalTheme } from "@riebeckite/theme-signal";

export default defineConfig({
  theme: signalTheme({
    colorMode: "system",
    preset: "poster",
    settings: { accentColor: "#e63b17" },
  }),
});
```

## Common options

| Property | Values | Description |
| --- | --- | --- |
| `colorMode` | `"light"`, `"dark"`, `"system"` | Chooses the color mode. `"system"` follows the browser preference. |
| `layout` | `"article"`, `"sidebar"`, `"full-width"` | Chooses the page layout. |
| `preset` | `poster`, `editorial`, `reading` | Applies a named set of theme settings before explicit `settings`. |
| `settings` | object | Overrides the settings listed below. Unknown keys and invalid values are rejected. |
| `stylesheets` | string array | Loads site-owned stylesheets after the theme CSS. |

Resolution order is schema defaults, then the selected preset, then explicit `settings`.

## Theme settings

| Property | Type | Default and allowed values | Effect |
| --- | --- | --- | --- |
| `accentColor` | color | `"#e63b17"` | Graphic accents, links, and markers. |
| `borderWeight` | select | `"bold"` — `standard`, `bold` | Selects the weight of structural borders. |
| `typography` | select | `"grotesk"` — `grotesk`, `system`, `serif`, `mono` | Selects the article typeface. |
| `density` | select | `"editorial"` — `poster`, `editorial`, `reading` | Selects the density of the reading surface. |
| `fontSize` | slider | `1.04` — 0.94–1.24, step 0.01 | Article text size in rem. |
| `lineHeight` | slider | `1.65` — 1.5–2.1, step 0.05 | Article line height. |
| `markers` | boolean | `true` | Show geometric section markers. |

## Presets

| Preset | Label | Applied settings |
| --- | --- | --- |
| `poster` | Poster | `{ density: "poster", borderWeight: "bold" }` |
| `editorial` | Editorial | `{ density: "editorial" }` |
| `reading` | Reading | `{ density: "reading", typography: "serif", borderWeight: "standard" }` |

## CSS and attributes

The root receives `data-rb-theme="signal"`, `data-rb-mode` for an explicit light or dark mode, and `data-rb-layout`. Every setting is reflected as `data-rb-setting-<name>`; color, number, and slider settings are also available as safe `--rb-setting-<name>` custom properties.

## See also

[Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md).
