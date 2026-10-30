---
date: 2026-10-01
title: Sakura
---
# Sakura

[日本語](./sakura.ja.md)

## Overview

`@riebeckite/theme-sakura` provides the official **Sakura** theme. Its theme identity is `sakura`. A soft Japanese-inspired theme with blossom details.

## Rendered example

**Light**

![[theme-sakura-light.png]]

**Dark**

![[theme-sakura-dark.png]]

## Installation

```sh
npm install @riebeckite/theme-sakura
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  theme: sakuraTheme({
    colorMode: "system",
    settings: { bloom: "soft" },
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
| `bloom` | select | `"soft"` — `soft`, `vivid` | Selects the intensity of blossom color. |
| `roundness` | select | `"soft"` — `soft`, `crisp` | Selects the roundness of theme details. |
| `heading` | select | `"decorated"` — `decorated`, `plain` | Selects the heading treatment. |
| `typography` | select | `"system"` — `system`, `serif`, `sans`, `mono` | Selects the article typeface. |
| `articleWidth` | slider | `46` — 34–60, step 1 | Maximum article width in rem. |
| `fontSize` | slider | `1.0625` — 0.9375–1.25, step 0.0625 | Article text size in rem. |
| `lineHeight` | slider | `1.9` — 1.5–2.1, step 0.05 | Article line height. |
| `petals` | boolean | `false` | Let petals drift across the article header. |

## Presets

This theme does not define presets.

## CSS and attributes

The root receives `data-rb-theme="sakura"`, `data-rb-mode` for an explicit light or dark mode, and `data-rb-layout`. Every setting is reflected as `data-rb-setting-<name>`; color, number, and slider settings are also available as safe `--rb-setting-<name>` custom properties.

## See also

[Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md).
