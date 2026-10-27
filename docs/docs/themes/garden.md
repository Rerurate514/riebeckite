---
title: Garden
---
# Garden

[日本語](./garden.ja.md)

`@riebeckite/theme-garden` provides the **Garden** official theme. Its identity is `garden` and its settings schema is the source of truth for configuration and the preview controls.

## Use it

```ts
import { defineConfig } from "@riebeckite/core";
import { gardenTheme } from "@riebeckite/theme-garden";

export default defineConfig({
  theme: gardenTheme({
    colorMode: "system",
    preset: "reading",
    settings: { typography: "serif" },
  }),
});
```

`colorMode` is `"light"`, `"dark"`, or `"system"`; `layout` is `"article"`, `"sidebar"`, or `"full-width"`; `stylesheets` adds site-owned stylesheets after theme CSS. A preset is applied before explicit `settings`.

## Settings

Read `gardenTheme.settings` for the complete typed schema, including labels, descriptions, allowed select values, slider bounds, and light/dark defaults. Unknown settings and invalid values are rejected at resolution time. This theme includes a `reading` preset.

Settings are reflected as `data-rb-setting-<name>` attributes. The root carries `data-rb-theme="garden"`, `data-rb-mode` only for explicit light or dark mode, and `data-rb-layout`.

See [Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md).