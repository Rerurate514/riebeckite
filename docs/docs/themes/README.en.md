---
title: Themes
sidebar:
  label: Themes
  order: 50
  collapsed: true
---
# Themes

Themes change how a Riebeckite site looks: colors, typography, spacing, layout, and article presentation. They do not add Markdown syntax, search, diagrams, or other features; use a [Plugin](../plugins/README.en.md) for those.

## Install a theme

Most generated sites already include a theme. `minimal` uses `@riebeckite/theme-minimal`; `starter` and `showcase` use `@riebeckite/theme-default`.

To add another theme, install its package:

```sh
npm install @riebeckite/theme-minimal
```

## Configure the theme

Import the theme factory and assign it to `theme` in `riebeckite.config.ts`:

```ts
import { defineConfig } from "@riebeckite/core";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  theme: minimalTheme(),
});
```

Some themes accept options. For example:

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

`userCss` is useful for small site-specific tweaks. If you want a reusable visual language, create a theme instead.

## Official themes

| Theme | Package | Factory | Best for |
| --- | --- | --- | --- |
| [Default](./default.en.md) | `@riebeckite/theme-default` | `defaultTheme()` | The normal starting point: readable, configurable, and compatible with color mode |
| [Minimal](./minimal.en.md) | `@riebeckite/theme-minimal` | `minimalTheme()` | A small baseline when you want little visual opinion |
| [Gruvbox](./gruvbox.en.md) | `@riebeckite/theme-gruvbox` | `gruvboxTheme()` | A warm, high-contrast Gruvbox-inspired look |
| [Rerurate](./rerurate.en.md) | `@riebeckite/theme-rerurate` | `rerurateTheme()` | Rerurate's visual grammar |
| [Sakura](./sakura.en.md) | `@riebeckite/theme-sakura` | `sakuraTheme()` | A sakura-inspired palette |
| [Tokyo Night](./tokyonight.en.md) | `@riebeckite/theme-tokyonight` | `tokyonightTheme()` | A Tokyo Night-inspired dark/editor-like look |

The package README is the source of truth for each theme's exported factory name and options.

## Create or extend a theme

Start with [Writing a theme](./writing-a-theme.en.md). Exact contracts live in [Theme API](../reference/theme-api.en.md), and the deeper design is described in [Framework / Theme system](../framework/theme-system.en.md).

## Next

- [Writing a theme](./writing-a-theme.en.md)
- [Theme API](../reference/theme-api.en.md)

