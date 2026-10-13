---
title: userCss
sidebar:
  hidden: true
---

# userCss

Extra stylesheets that load last in the CSS cascade, allowing site authors to make final adjustments to the theme's appearance without forking the theme. userCss wins over theme CSS, plugin CSS, and config token styles.

## Cascade position

Load order: framework CSS → plugin CSS → theme CSS → config token inline style → userCss
userCss is the final override — ideal for small site-specific tweaks.

```ts
export default defineConfig({
  theme: defaultTheme({
    userCss: ["/extensions/custom.css"],
  }),
});
```

## Use cases

Adjust article spacing slightly
Change the text size of a specific element
Add site-specific decoration
Use `userCss` for tweaks; reorganize into a theme when changes grow.

## Related terms

- [[glossary/theme|Theme]]
- [[presentation-layer|Presentation Layer]]
- [[glossary/color-mode|Color Mode]]

## Learn more

- [CSS](../framework/theme-system/css.md)
