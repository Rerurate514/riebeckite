---
date: 2026-10-25
title: Editorial
---
# Editorial

A long-form blog theme with ivory paper, ink-heavy serif type, and burgundy
interaction states.

[日本語](./editorial.ja.md)

## Usage

```ts
import { editorialTheme } from "@riebeckite/theme-editorial";

export default defineConfig({
  theme: editorialTheme({ colorMode: "system" }),
});
```

## Character

- Centered, generous article titles establish a publishing hierarchy.
- Long-form serif copy, display-like headings, and ruled pull quotes create an
  editorial rhythm without shadows, gradients, or card grids.
- Metadata and site chrome use compact sans-serif text to remain secondary.

## Options and tokens

`editorialTheme(options?)` accepts `ThemeConfig` fields other than `name`:
`colorMode`, `typography`, `articleLayout`, `tokens`, and `userCss`. Override
the shared semantic color, font, spacing, and layout tokens through `tokens`.

## Modes and compatibility

The light, explicit-dark, and system-dark palettes expose the same token set.
The stylesheet has visible keyboard focus, reduced-motion behavior, responsive
type, scrollable tables, and stable public roots for callouts, recent posts,
and backlinks. It bundles no fonts or runtime code.

## Exports

- `editorialTheme(options?)`
- `EditorialThemeOptions`
- `@riebeckite/theme-editorial/style.css`
