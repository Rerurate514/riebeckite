---
date: 2026-10-14
title: stylesheets
sidebar:
  hidden: true
---
# stylesheets

Extra stylesheets that load after the application stylesheet, allowing site authors to make final adjustments without forking the theme. Their unlayered normal declarations win over framework, plugin, and theme normal declarations, but not inline configuration tokens, `!important`, animations, or transitions.

## Cascade position
Normal-declaration layer order: `base` → `components` → `utilities` → `rb-plugins` → `rb-theme` → unlayered site CSS. `stylesheets` is unlayered site CSS and is suitable for small final tweaks.

```ts
export default defineConfig({
  theme: defaultTheme({
    stylesheets: ["/extensions/custom.css"],
  }),
});
```

## stylesheets File Setup
`stylesheets` is configured as an array of stylesheet paths in `defineConfig`, e.g., `stylesheets: ["/extensions/custom.css"]`. The loaded stylesheets are added to the page header in the order provided; among otherwise equal declarations, the later stylesheet wins by source order.

## Use cases
- Adjust article spacing slightly
- Change the text size of a specific element
- Add site-specific decoration
Use `stylesheets` for tweaks; reorganize into a theme when changes grow.

## Related terms
- [[glossary/theme|Theme]]
- [[presentation-layer|Presentation Layer]]
- [[glossary/color-mode|Color Mode]]

## Learn more
- [CSS](../framework/theme-system/css.md)
