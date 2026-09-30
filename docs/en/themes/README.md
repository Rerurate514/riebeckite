# Themes

Themes change how a Riebeckite site looks: color, typography, spacing, layout, and the styling of stable framework and plugin hooks. They do not add content features or client behavior; use a [Plugin](../plugins/README.md) for that. A theme must remain usable for plugin Page Types it does not know, so target tokens and stable hooks rather than individual routes.

## Use a theme

Install the package, import its factory, and assign it to `theme` in `riebeckite.config.ts`.

```sh
npm install @riebeckite/theme-minimal
```

```ts
import { defineConfig } from "@riebeckite/core";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  theme: minimalTheme(),
});
```

Most generated sites already include a theme package. `minimal` uses `@riebeckite/theme-minimal`; `starter` and higher presets use `@riebeckite/theme-default`.

## Official themes

| Theme | Package | Factory | Best for |
| --- | --- | --- | --- |
| Default | [`@riebeckite/theme-default`](../../../packages/themes/default/README.md) | `defaultTheme()` | The normal starting point: readable, configurable, and compatible with color mode |
| Minimal | [`@riebeckite/theme-minimal`](../../../packages/themes/minimal/README.md) | `minimalTheme()` | A small baseline when you want little visual opinion |
| Gruvbox | [`@riebeckite/theme-gruvbox`](../../../packages/themes/gruvbox/README.md) | package README | A warm, high-contrast Gruvbox-inspired look |
| Rerurate | [`@riebeckite/theme-rerurate`](../../../packages/themes/rerurate/README.md) | package README | Rerurate's visual grammar |
| Sakura | [`@riebeckite/theme-sakura`](../../../packages/themes/sakura/README.md) | package README | A sakura-inspired palette |
| Tokyo Night | [`@riebeckite/theme-tokyonight`](../../../packages/themes/tokyonight/README.md) | package README | A Tokyo Night-inspired dark/editor-like look |

The package README is the source of truth for each theme's exported factory name and options.

## Common options

Built-in themes use the shared theme contract from `@riebeckite/core`. Common presets include:

```ts
type ThemeColorMode = "light" | "dark" | "system";
type ThemeTypographyPreset = "system" | "serif" | "sans";
type ThemeArticleLayoutPreset = "article" | "sidebar" | "full-width";
```

Example with the default theme:

```ts
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  theme: defaultTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    userCss: ["/extensions/custom.css"],
  }),
});
```

`userCss` loads last and is the right place for a small site-specific tweak. If you are creating a reusable visual language, write a theme instead.

## Create or extend a theme

Start with [Writing a theme](./writing-a-theme.md). The API contract — `defineTheme`, stylesheet module specifiers, design tokens, stable hooks, the cascade, and package layout — lives in [Theme API](../reference/theme-api.md). The internal boundary between themes, plugins, Core, and the HonoX integration is explained in [Framework / Theme system](../framework/theme-system.md).

