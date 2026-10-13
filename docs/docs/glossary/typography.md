---
title: Typography
sidebar:
  hidden: true
---

# Typography

The typographic configuration of the site — font families, sizes, line heights — applied through theme presets (`system`, `serif`, `sans`) via the `data-typography` attribute on the theme root.

## Presets

Three typography presets are available: `system`, `serif`, `sans`.
The preset is reflected in semantic font tokens (--rb-font-body, --rb-font-heading, --rb-font-mono).
Swapping the preset changes the font family via `:root[data-typography=...]` CSS rules.

## Article layout

Typography and article layout work together to control text presentation.
The `data-typography` attribute is applied at the theme root (`[data-theme-root]` or `<html>`).
Combined with `data-article-layout`, the full article presentation is determined.

## Related terms

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|Semantic Token]]
- [[article-layout|Article Layout]]

## Learn more

- [Typography](../framework/theme-system/typography.md)
