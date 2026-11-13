---
date: 2026-10-14
title: Typography
sidebar.hidden: true
---
# Typography

Typography is the theme's font configuration: families, sizes, and line heights. Themes declare a `typography` setting and map it to semantic font tokens; it is not a Core type or a `ThemeOptions` field.

## Theme setting

```ts
settings: defineThemeSettings({
  typography: {
    type: "select",
    label: "Typography",
    default: "system",
    options: [
      { value: "system", label: "System" },
      { value: "serif", label: "Serif" },
      { value: "sans", label: "Sans" },
    ],
  },
}),
```

The resolved value is reflected as `data-rb-setting-typography` on the theme root (`.rb-theme-root` or `<html>`).

## CSS mapping

```css
:is(:root, .rb-theme-root)[data-rb-setting-typography="serif"] {
  --rb-font-body: Georgia, serif;
  --rb-font-heading: "Libre Baskerville", serif;
  --rb-font-mono: "Source Code Pro", monospace;
}
```

Theme presets can set the same setting. Combined with `data-rb-layout`, typography and article layout determine the article presentation.

## Related terms
- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|Semantic Token]]
- [[article-layout|Article Layout]]

## Learn more
- [Typography](../framework/theme-system/typography.md)
