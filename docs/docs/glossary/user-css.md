---
date: 2026-10-14
title: stylesheets
sidebar:
  hidden: true
---
# stylesheets

Extra stylesheets that load last in the CSS cascade, allowing site authors to make final adjustments to the theme's appearance without forking the theme. stylesheets wins over theme CSS, plugin CSS, and config token styles.

## Cascade position
Load order: framework CSS → plugin CSS → theme CSS → config token inline style → stylesheets
stylesheets is the final override — ideal for small site-specific tweaks.

```ts
export default defineConfig({
  theme: defaultTheme({
    stylesheets: ["/extensions/custom.css"],
  }),
});
```

## stylesheets File Setup
`stylesheets` is configured as an array of stylesheet paths in `defineConfig`, e.g., `stylesheets: ["/extensions/custom.css"]`. The loaded stylesheets are added to the page header in the order provided, with the last stylesheet having the highest specificity.

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