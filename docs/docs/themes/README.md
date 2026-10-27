---
title: Themes
sidebar:
  label: Themes
  order: 50
  collapsed: true
---

# Themes

Themes define a reading surface. They use a typed settings schema for configuration, runtime validation, preview controls, and safe CSS reflection.

## Try and install

The [Theme Showcase](/themes) previews all official themes in a sandboxed document. It has live settings, presets, light/dark/system modes, desktop/tablet/mobile widths, reset, and configuration export.

```sh
npm install @riebeckite/theme-garden
```

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

## Options

Every theme factory accepts `colorMode`, `layout`, `preset`, `settings`, and `stylesheets`. Settings are declared by the theme: values are inferred by TypeScript, checked at runtime, and reflected as `data-rb-setting-*`. Resolution order is defaults, then preset, then explicit settings.

The root contract is `data-rb-theme`, `data-rb-mode` for an explicit light/dark choice, and `data-rb-layout`. System mode omits `data-rb-mode`.

## Official themes

- [Default](./default.md)
- [Editorial](./editorial.md)
- [Folio](./folio.md)
- [Garden](./garden.md)
- [Gruvbox](./gruvbox.md)
- [Minimal](./minimal.md)
- [Module](./module.md)
- [Rerurate](./rerurate.md)
- [Sakura](./sakura.md)
- [Technical](./technical.md)
- [Tokyo Night](./tokyonight.md)

Use a [Plugin](../plugins/README.md) for behavior. See [Writing a theme](./writing-a-theme.md) and [Theme API](../reference/theme-api.md) for the contract.
