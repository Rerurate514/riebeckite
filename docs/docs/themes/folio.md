---
date: 2026-10-25
title: Folio
---
# Folio

A high-contrast portfolio theme with direct sans-serif typography, an
asymmetric title rule, and a restrained vermilion accent.

[日本語](./folio.ja.md)

## Usage

```ts
import { folioTheme } from "@riebeckite/theme-folio";

export default defineConfig({
  theme: folioTheme({ colorMode: "system" }),
});
```

## Character

- Large, tightly tracked titles and a left accent rule give project pages a
  confident hierarchy.
- A wide article measure suits project descriptions and media without turning
  content into a card grid.
- Media, lightbox, recent posts, and card links receive structural top rules
  through stable public plugin roots.

## Options and tokens

`folioTheme(options?)` accepts `ThemeConfig` fields other than `name`:
`colorMode`, `typography`, `articleLayout`, `tokens`, and `userCss`. Use
`tokens` for shared semantic color, type, spacing, and layout overrides.

## Modes and compatibility

The theme has matching light, explicit-dark, and system-dark token contracts.
It supports visible focus, responsive typography, reduced motion, and
horizontally scrollable tables. It ships only CSS and uses system fonts.

## Exports

- `folioTheme(options?)`
- `FolioThemeOptions`
- `@riebeckite/theme-folio/style.css`
