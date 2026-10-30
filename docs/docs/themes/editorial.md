---
date: 2026-10-25
title: Editorial
---
# Editorial

[日本語](./editorial.ja.md)

## Overview

`@riebeckite/theme-editorial` provides the official **Editorial** theme. Its theme identity is `editorial`. A publication-style theme with typographic details and article ornaments.

## Rendered example

**Light**

![[theme-editorial-light.png]]

**Dark**

![[theme-editorial-dark.png]]

## Installation

```sh
npm install @riebeckite/theme-editorial
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { editorialTheme } from "@riebeckite/theme-editorial";

export default defineConfig({
  theme: editorialTheme({
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
| `accentColor` | color | `"#8a2738"` | Rules and interactive accents. |
| `articleWidth` | slider | `48` — 36–64, step 1 | Maximum article width in rem. |
| `fontSize` | slider | `1.125` — 0.9375–1.25, step 0.0625 | Article text size in rem. |
| `lineHeight` | slider | `1.9` — 1.5–2.1, step 0.05 | Article line height. |
| `motion` | boolean | `true` | Enables theme motion effects. |
| `dropCap` | boolean | `false` | Enlarge the first letter of the article. |
| `ornament` | boolean | `true` | Show the editorial ornament in the article header. |

## Presets

This theme does not define presets.

## CSS and attributes

The root receives `data-rb-theme="editorial"`, `data-rb-mode` for an explicit light or dark mode, and `data-rb-layout`. Every setting is reflected as `data-rb-setting-<name>`; color, number, and slider settings are also available as safe `--rb-setting-<name>` custom properties.

## See also

[Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md).
