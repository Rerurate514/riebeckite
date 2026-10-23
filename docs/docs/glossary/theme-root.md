---
date: 2026-10-14
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

## Theme Root UI Component
The framework provides `ThemeRoot`, a UI primitive from `@riebeckite/honox/ui` that handles setting theme attributes on the `<html>` element. Usage:
```tsx
import { ThemeRoot } from "@riebeckite/honox/ui";
<ThemeRoot
  theme={config.theme}
  lang={c.get("htmlLanguage") ?? config.site.locale}
>
  {children}
</ThemeRoot>
```
`ThemeRoot` renders the `<html>` element with the following attributes: `lang`, `data-theme-name`, `data-theme`, `data-typography`, and `data-article-layout`.

## Reserved Attributes on `<html>`
The framework-reserved attributes `data-theme`, `data-theme-name`, `data-typography`, and `data-article-layout` cannot be overwritten by the theme's `attributes`. To add custom `<html>` attributes, use the `themeRootAttributes` helper directly:
```tsx
import { themeRootAttributes } from "@riebeckite/honox/ui";
<html
  lang={c.get("htmlLanguage") ?? config.site.locale}
  {...themeRootAttributes(config.theme)}
  data-custom-attr="..."
>
  ...
</html>
```

## Related terms

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]

## Learn more

- [Theme Root](../framework/theme-system/theme-root.md)
