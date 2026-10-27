---
date: 2026-10-25
title: Garden
---
# Garden

A warm, note-first theme for connected digital gardens. It uses a calm serif
reading rhythm, olive interactive states, and rules rather than panels.

[日本語](./garden.ja.md)

## Usage

```ts
import { gardenTheme } from "@riebeckite/theme-garden";

export default defineConfig({
  theme: gardenTheme({ colorMode: "system" }),
});
```

## Character

- Warm paper, green links, and generous serif text support exploratory notes.
- A leaf-and-stem SVG gives the article header and section headings a quiet
  botanical thread; its short grow-in respects reduced-motion preferences.
- Backlinks, local graphs, garden explorer, and callouts receive shared
  ruled treatment through their stable public roots.

## Options and tokens

`gardenTheme(options?)` accepts `ThemeConfig` fields other than `name`,
including `colorMode`, `typography`, `articleLayout`, `tokens`, and `userCss`.
Use `tokens` to override the shared `--rb-color-*`, `--rb-font-*`, and layout
tokens without changing the theme stylesheet.

## Modes and compatibility

Light, explicit dark, and system dark modes define the same semantic token
contract. `colorMode: "system"` follows `prefers-color-scheme` until a
`data-theme` attribute is set. The stylesheet supports reduced motion, narrow
screens, keyboard focus, and horizontally scrollable tables. It uses only
system fonts and stable `rb-*` and `rr-*` hooks.

## Exports

- `gardenTheme(options?)`
- `GardenThemeOptions`
- `@riebeckite/theme-garden/style.css`
