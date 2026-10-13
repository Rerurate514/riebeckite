---
title: Theme Root
sidebar:
  hidden: true
---

# Theme Root

The theme root selector (`[data-theme-root]` or `<html>`) that scopes token and attribute rules to the whole page. Color mode and typography attributes are applied here so the cascade reaches all elements.

## Selector

Every theme rule is scoped to the theme's identity name:

```css
:is(:root, .rb-theme-root)[data-theme-name="<name>"] { /* light */ }
:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-theme="dark"] { /* dark */ }
```

## Data attributes

ThemeRoot emits the following attributes on `<html>`:

- `data-theme-name`: Theme identity name (e.g. "riebeckite", "minimal")
- `data-theme`: Color mode state ("light" / "dark" / omitted for "system")
- `data-typography`: Typography preset value
- `data-article-layout`: Article layout preset value

## Related terms

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]

## Learn more

- [Theme Root](../framework/theme-system/theme-root.md)
