---
date: 2026-10-25
title: Editorial
---
# Editorial

A long-form essay theme with an ivory paper palette, bookish serif type, and
burgundy editorial marks.

[日本語](./editorial.ja.md)

## Usage

```ts
import { editorialTheme } from "@riebeckite/theme-editorial";

export default defineConfig({
  theme: editorialTheme({ colorMode: "system" }),
});
```

## Character

- An ornamented title page, restrained metadata, and display-like serif type
  establish a magazine-like opening without adding markup.
- Ruled section breaks, italic subheads, and centered pull quotes give essays a
  deliberate print rhythm.
- Embedded SVG ornaments and a short title reveal add character while honoring
  reduced-motion preferences.

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
