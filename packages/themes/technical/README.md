# @riebeckite/theme-technical

<!-- Generated from docs/docs/themes/technical.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

A dense documentation theme with neutral surfaces, compact sans-serif type,
and blue technical cues.

[日本語](./README_ja.md)

## Usage

```ts
import { technicalTheme } from "@riebeckite/theme-technical";

export default defineConfig({
  theme: technicalTheme({ colorMode: "system" }),
});
```

## Character

- A broad page, compact article measure, and small navigation text make dense
  reference material easy to scan.
- Strong article rules, blue `h3` labels, monospaced metadata, and square table
  cells separate concepts without decorative surfaces.
- Table of contents, code, code tabs, callouts, and queries use their stable
  public roots and shared borders.

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
