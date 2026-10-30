---
date: 2026-10-01
title: Rerurate
---
# Rerurate

[日本語](./rerurate.ja.md)

## Overview

`@riebeckite/theme-rerurate` provides the official **Rerurate** theme. Its theme identity is `rerurate`. Rerurate's paper-and-ink reading theme with optional celestial details.

## Rendered example

**Light**

![[theme-rerurate-light.png]]

**Dark**

![[theme-rerurate-dark.png]]

## Installation

```sh
npm install @riebeckite/theme-rerurate
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  theme: rerurateTheme({
    colorMode: "system",
    settings: { initial: "off" },
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
| `initial` | select | `"off"` — `off`, `small`, `medium`, `large` | Selects the size of the article initial. |
| `largeHeadings` | boolean | `false` | Uses larger article headings. |
| `headingMarks` | boolean | `true` | Shows marks beside headings. |
| `motion` | boolean | `true` | Enables theme motion effects. |
| `stars` | boolean | `false` | Scatter a low-contrast starfield across the article header. |
| `constellation` | boolean | `false` | Connect the header stars into a thin constellation. |
| `orbit` | boolean | `false` | Draw a faint orbital ring around the article header. |
| `typography` | select | `"system"` — `system`, `serif`, `sans`, `mono` | Selects the article typeface. |
| `fontSize` | slider | `1` — 0.9375–1.25, step 0.0625 | Article text size in rem. |
| `lineHeight` | slider | `1.75` — 1.5–2.1, step 0.05 | Article line height. |

## Presets

This theme does not define presets.

## CSS and attributes

The root receives `data-rb-theme="rerurate"`, `data-rb-mode` for an explicit light or dark mode, and `data-rb-layout`. Every setting is reflected as `data-rb-setting-<name>`; color, number, and slider settings are also available as safe `--rb-setting-<name>` custom properties.

## See also

[Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md).
