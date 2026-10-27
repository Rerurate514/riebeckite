# @riebeckite/theme-folio

<!-- Generated from docs/docs/themes/folio.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

A high-contrast portfolio theme with direct sans-serif typography, an
asymmetric title rule, and a restrained vermilion accent.

[日本語](./README_ja.md)

## Usage

```ts
import { folioTheme } from "@riebeckite/theme-folio";

export default defineConfig({
  theme: folioTheme({ colorMode: "system" }),
});
```

## Character

- Large, tightly tracked titles, a left accent rule, and an SVG crop mark give
  project pages a confident poster-like hierarchy.
- A wide article measure suits project descriptions and media without turning
  content into a card grid.
- Media, lightbox, recent posts, and card links receive structural top rules
  through stable public plugin roots; the frame and card hover use brief,
  reduced-motion-safe movement.

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
