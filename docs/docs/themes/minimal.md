---
date: 2026-10-01
title: Minimal
---
# Minimal

[日本語](./minimal.ja.md)

## Overview

`@riebeckite/theme-minimal` provides the official **Minimal** theme. Its theme identity is `minimal`. A quiet, content-first theme with restrained decoration.

## Installation

```sh
npm install @riebeckite/theme-minimal
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  theme: minimalTheme({
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
| `accentColor` | color | `"#1a1a1a"` | Selection, focus, and quiet interactive accents. |
| `articleWidth` | slider | `43` — 32–56, step 1 | Maximum article width in rem. |
| `fontSize` | slider | `1.0625` — 0.9375–1.25, step 0.0625 | Article text size in rem. |
| `lineHeight` | slider | `1.85` — 1.5–2.1, step 0.05 | Article line height. |
| `imageGrid` | boolean | `false` | Place consecutive images in a two-column grid. |
| `flourish` | boolean | `false` | Show a subtle SVG flourish in the article header. |

## Presets

This theme does not define presets.

## CSS and attributes

The root receives `data-rb-theme="minimal"`, `data-rb-mode` for an explicit light or dark mode, and `data-rb-layout`. Every setting is reflected as `data-rb-setting-<name>`; color, number, and slider settings are also available as safe `--rb-setting-<name>` custom properties.

## See also

[Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md).
