---
date: 2026-10-25
title: Technical
---
# Technical

[日本語](./technical.ja.md)

## Overview

`@riebeckite/theme-technical` provides the official **Technical** theme. Its theme identity is `technical`. A blueprint-inspired theme for technical writing.

## Installation

```sh
npm install @riebeckite/theme-technical
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { technicalTheme } from "@riebeckite/theme-technical";

export default defineConfig({
  theme: technicalTheme({
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
| `accentColor` | color | `"#1766b1"` | Rules and interactive accents. |
| `articleWidth` | slider | `52` — 40–68, step 1 | Maximum article width in rem. |
| `fontSize` | slider | `1` — 0.9375–1.25, step 0.0625 | Article text size in rem. |
| `lineHeight` | slider | `1.75` — 1.5–2.1, step 0.05 | Article line height. |
| `ornaments` | boolean | `true` | Show the technical ornaments in the article header. |
| `terminal` | boolean | `false` | Set the article body in a monospace face. |

## Presets

This theme does not define presets.

## CSS and attributes

The root receives `data-rb-theme="technical"`, `data-rb-mode` for an explicit light or dark mode, and `data-rb-layout`. Every setting is reflected as `data-rb-setting-<name>`; color, number, and slider settings are also available as safe `--rb-setting-<name>` custom properties.

## See also

[Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md).
