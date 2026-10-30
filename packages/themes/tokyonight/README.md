# @riebeckite/theme-tokyonight

<!-- Generated from docs/docs/themes/tokyonight.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

[日本語](./README_ja.md)

## Overview

`@riebeckite/theme-tokyonight` provides the official **Tokyo Night** theme. Its theme identity is `tokyonight`. A night-oriented theme with technical typography and neon accents.

## Rendered example

**Light**

![theme-tokyonight-light.png](https://github.com/Rerurate514/riebeckite/blob/main/docs/assets/themes/theme-tokyonight-light.png)

**Dark**

![theme-tokyonight-dark.png](https://github.com/Rerurate514/riebeckite/blob/main/docs/assets/themes/theme-tokyonight-dark.png)

## Installation

```sh
npm install @riebeckite/theme-tokyonight
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { tokyonightTheme } from "@riebeckite/theme-tokyonight";

export default defineConfig({
  theme: tokyonightTheme({
    colorMode: "system",
    settings: { density: "cozy" },
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
| `density` | select | `"cozy"` — `cozy`, `compact` | Selects the density of the reading surface. |
| `heading` | select | `"tech"` — `tech`, `plain` | Selects the heading treatment. |
| `neon` | boolean | `false` | Enables neon highlights. |
| `typography` | select | `"system"` — `system`, `serif`, `sans`, `mono` | Selects the article typeface. |
| `articleWidth` | slider | `48` — 36–64, step 1 | Maximum article width in rem. |
| `fontSize` | slider | `1` — 0.9375–1.25, step 0.0625 | Article text size in rem. |
| `lineHeight` | slider | `1.7` — 1.5–2.1, step 0.05 | Article line height. |
| `aurora` | boolean | `false` | Animate a neon aurora line under the article header. |

## Presets

This theme does not define presets.

## CSS and attributes

The root receives `data-rb-theme="tokyonight"`, `data-rb-mode` for an explicit light or dark mode, and `data-rb-layout`. Every setting is reflected as `data-rb-setting-<name>`; color, number, and slider settings are also available as safe `--rb-setting-<name>` custom properties.

## See also

[Theme API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md) and [Writing a theme](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.md).
