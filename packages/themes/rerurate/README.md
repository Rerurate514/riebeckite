# @riebeckite/theme-rerurate

<!-- Generated from docs/docs/themes/rerurate.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

`@riebeckite/theme-rerurate` provides the **Rerurate** official theme. Its identity is `rerurate` and its settings schema is the source of truth for configuration and the preview controls.

## Use it

```ts
import { defineConfig } from "@riebeckite/core";
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  theme: rerurateTheme({
    colorMode: "system",
    preset: "reading",
    settings: { typography: "serif" },
  }),
});
```

`colorMode` is `"light"`, `"dark"`, or `"system"`; `layout` is `"article"`, `"sidebar"`, or `"full-width"`; `stylesheets` adds site-owned stylesheets after theme CSS. A preset is applied before explicit `settings`.

## Settings

Read `rerurateTheme.settings` for the complete typed schema, including labels, descriptions, allowed select values, slider bounds, and light/dark defaults. Unknown settings and invalid values are rejected at resolution time. This theme includes a `reading` preset.

Settings are reflected as `data-rb-setting-<name>` attributes. The root carries `data-rb-theme="rerurate"`, `data-rb-mode` only for explicit light or dark mode, and `data-rb-layout`.

See [Theme API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md) and [Writing a theme](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.md).
