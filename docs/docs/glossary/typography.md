---
date: 2026-10-14
title: Typography
sidebar:
  hidden: true
---
# Typography

The typographic configuration of the site — font families, sizes, line heights — applied through theme presets (`system`, `serif`, `sans`) via the `data-rb-setting-typography` attribute on the theme root.

## Presets
Three typography presets are available: `system`, `serif`, `sans`. The preset is reflected in semantic font tokens (--rb-font-body, --rb-font-heading, --rb-font-mono). Swapping the preset changes the font family via `:root[data-rb-setting-typography=...]` CSS rules.

## Article layout
Typography and article layout work together to control text presentation. The `data-rb-setting-typography` attribute is applied at the theme root (`[data-theme-root]` or `<html>`). Combined with `data-rb-layout`, the full article presentation is determined.

## Typography Preset Types
Three typography presets are available: `system`, `serif`, `sans`. The preset is reflected in semantic font tokens (`--rb-font-body`, `--rb-font-heading`, `--rb-font-mono`). Font-family selection is defined by the preset in the theme config (`packages/core/src/types/theme_config.ts` `ThemeTypographyPreset` type):

- `system` — Uses the OS/system default fonts
- `serif` — Uses serif font family (e.g., Georgia, Libre Baskerville)
- `sans` — Uses sans-serif font family (e.g., system-ui, Inter)

The preset changes the font family via `:root[data-rb-setting-typography=...]` CSS rules at the theme root.

## Token Flow from Theme Config to CSS
Typography tokens flow from the theme config through the `data-rb-setting-typography` attribute on the theme root. When a preset is selected, the CSS rule `[data-rb-setting-typography="serif"]` (or `system`/`sans`) targets the theme root and swaps font-family values. This enables presentational changes without modifying component CSS — the token names (`--rb-font-body`, etc.) remain the same, only the font mapping changes.

```css
/* Example: serif preset applies */
:root[data-rb-setting-typography="serif"] {
  --rb-font-body: Georgia, serif;
  --rb-font-heading: "Libre Baskerville", serif;
  --rb-font-mono: "Source Code Pro", monospace;
}
```

Combined with `data-rb-layout`, the full article presentation is determined.

## ThemeTypographyPreset Type
The `ThemeTypographyPreset` type from `packages/core/src/types/theme_config.ts` has the union type `"system" | "serif" | "sans"`. This type is used in `ThemeOptions` to select a typography preset that determines font-family mapping at the theme root.

## Typography CSS at Theme Root
Typography presets are reflected in CSS rules using the `data-rb-setting-typography` attribute on the theme root: `:is(:root, .rb-theme-root)[data-rb-setting-typography="serif"]` swaps font-family values for semantic tokens `--rb-font-body`, `--rb-font-heading`, and `--rb-font-mono`. The preset change is purely presentational — the token names remain the same, only the font mapping changes.

```css
:is(:root, .rb-theme-root)[data-rb-setting-typography="serif"] {
  --rb-font-body: Georgia, serif;
  --rb-font-heading: "Libre Baskerville", serif;
  --rb-font-mono: "Source Code Pro", monospace;
}
```

## Related terms
- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|Semantic Token]]
- [[article-layout|Article Layout]]

## Learn more
- [Typography](../framework/theme-system/typography.md)