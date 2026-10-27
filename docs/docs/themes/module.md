---
title: Module
---
# Module

[日本語](./module.ja.md)

`@riebeckite/theme-module` provides the **Module** official theme. It combines a calibrated blueprint grid, steel surfaces, and warm edge lighting for technical notes that need a darker, more deliberate interface.

## Use it

```ts
import { defineConfig } from "@riebeckite/core";
import { moduleTheme } from "@riebeckite/theme-module";

export default defineConfig({
  theme: moduleTheme({
    colorMode: "dark",
    settings: { glow: true },
  }),
});
```

`colorMode` is `"light"`, `"dark"`, or `"system"`; `layout` is `"article"`, `"sidebar"`, or `"full-width"`; `stylesheets` adds site-owned stylesheets after theme CSS. A preset is applied before explicit `settings`.

## Settings

Read `moduleTheme.settings` for the complete typed schema, including labels, descriptions, allowed select values, slider bounds, and light/dark defaults. Unknown settings and invalid values are rejected at resolution time. This theme includes a `reading` preset.

Settings are reflected as `data-rb-setting-<name>` attributes. The root carries `data-rb-theme="module"`, `data-rb-mode` only for explicit light or dark mode, and `data-rb-layout`.

See [Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md) for the contract.
