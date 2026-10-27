---
date: 2026-10-27
title: Theme API
---
# Theme API

A theme is a callable definition. Define its schema once; configuration, CSS reflection, previews, presets, and validation all use that schema.

```ts
import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const myTheme = defineTheme({
  name: "my-theme",
  styles: [{ moduleSpecifier: "/themes/my-theme.css" }],
  settings: defineThemeSettings({
    accent: {
      type: "color",
      label: "Accent",
      default: "#176b5a",
      light: "#176b5a",
      dark: "#78d2b3",
    },
    density: {
      type: "select",
      label: "Density",
      default: "comfortable",
      options: [
        { value: "comfortable", label: "Comfortable" },
        { value: "compact", label: "Compact" },
      ],
    },
  }),
  presets: {
    compact: { label: "Compact", settings: { density: "compact" } },
  },
});
```

Use the theme by calling it:

```ts
export default defineConfig({
  theme: myTheme({
    colorMode: "system",
    layout: "article",
    preset: "compact",
    settings: { accent: "#cc5500" },
    stylesheets: ["/site.css"],
  }),
});
```

`settings` accepts `color`, `boolean`, `number`, `slider`, `select`, and `text`. Every setting has a label and default; it may also have a description, section, group, light/dark values, numeric range, and select options. Settings are checked at runtime. Unknown keys and invalid values are rejected.

Resolution order is schema defaults, then a preset, then explicit `settings`. Color, number, and slider settings are reflected as safe `--rb-setting-*` custom properties. Every setting is reflected as a `data-rb-setting-*` attribute. Roots use `data-rb-theme`, `data-rb-mode`, and `data-rb-layout`.

Themes set semantic `--rb-*` tokens; components and plugins consume them. Theme CSS is loaded after framework and plugin CSS, while `stylesheets` load last for site overrides.

```css
:is(:root, .rb-theme-root)[data-rb-theme="my-theme"] {
  color: var(--rb-color-ink);
}

:is(:root, .rb-theme-root)[data-rb-theme="my-theme"][data-rb-setting-density="compact"] {
  --rb-layout-gap: 1rem;
}
```