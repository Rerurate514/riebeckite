---
date: 2026-10-25
title: Technical
---
# Technical

A documentation theme that treats dense reference material as an instrument
panel: systematic, compact, and easy to scan.

[日本語](./technical.ja.md)

## Usage

```ts
import { technicalTheme } from "@riebeckite/theme-technical";

export default defineConfig({
  theme: technicalTheme({ colorMode: "system" }),
});
```

## Character

- A gridded title panel and circuit motif make the page structure visible before
  readers enter the content.
- Numbered sections, monospaced headings, signal markers, and precise borders
  separate reference concepts at a glance.
- Code and plugin surfaces keep the same instrument-panel geometry; the title
  signal animates once and respects reduced-motion preferences.

## Options and tokens

`technicalTheme(options?)` accepts `ThemeConfig` fields except `name`:
`colorMode`, `typography`, `articleLayout`, `tokens`, and `userCss`. Shared
semantic color, font, spacing, and layout tokens can be overridden with
`tokens`.

## Modes and compatibility

Light, explicit dark, and system dark define identical semantic roles. The
theme provides keyboard focus, responsive type, horizontal table overflow, and
reduced-motion handling. It uses system font stacks only and styles no
plugin-internal selectors.

## Exports

- `technicalTheme(options?)`
- `TechnicalThemeOptions`
- `@riebeckite/theme-technical/style.css`
