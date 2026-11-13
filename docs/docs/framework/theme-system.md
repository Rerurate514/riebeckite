---
date: 2026-10-06
title: Themes in Depth
sidebar.label: Themes in Depth
---

# Themes in Depth

[Your First Theme](../themes/writing-a-theme.md) is a short walkthrough that gets a theme running. This page is its "in depth" companion: it collects everything you refer to while building a theme — options, tokens, hooks, the CSS cascade, and packaging.

If you are new, read [your first theme](../themes/writing-a-theme.md) first, and use this page when you want more detail. For the complete API surface, see [Theme API](../reference/theme-api.md).

## How this page is organized

- [Color mode](./theme-system/color-mode.md)
- [Typography and article layout](./theme-system/typography.md)
- [Design tokens](./theme-system/tokens.md)
- [Theme root and attributes](./theme-system/theme-root.md)
- [Stable CSS hooks and the cascade](./theme-system/css.md)
- [Packaging and verification](./theme-system/distribution.md)

## 1. What a theme can and cannot do

A [[glossary/theme|theme]] is the **presentation layer**. It changes tokens, stylesheet rules, and theme settings reflected as `data-rb-setting-*` attributes. It does not change content semantics or application structure.

| Can | Cannot |
| --- | --- |
| Override or add tokens | Component replacement |
| Define stylesheet rules | JSX injection |
| Declare theme-specific settings as `data-rb-setting-*` attributes | Route additions |
| Declare color mode and layout options | Adding or removing plugins |
| Provide the final override through `stylesheets` | Client script execution |
| Style stable hooks | DOM transformation, island registration, filesystem access, [[glossary/content-manager|ContentManager]] access |

If you are unsure, decide like this:

```mermaid
flowchart TD
    Q{"What do you want to change?"}

    Q -->|"Appearance"| Theme["Theme"]
    Q -->|"Reusable functionality"| Plugin["Plugin"]
    Q -->|"Site-specific route / layout structure"| App["Application"]
    Q -->|"Framework-wide model"| Core["Core"]
```

In short:

```text
Functionality
  -> Plugin

Appearance
  -> Theme

Site-specific route
  -> Application
```

Keep the boundary: do not write a plugin just to change appearance, and do not extend a theme to add features. Features go in plugins, plain appearance in themes, and site-specific routes in the app.

## 2. The defineTheme contract

`defineTheme` is imported from `@riebeckite/core`. A theme definition has four parts.

| Area | Contents |
| --- | --- |
| Identity | `name` |
| Styles | `styles[].moduleSpecifier` |
| Settings | optional `settings` schema |
| Presets | optional named setting presets |
| Palette | optional `light` / `dark` image colors |

`palette` is optional. It supplies the background, foreground, and accent used
by generated Open Graph images; it does not affect CSS. Keep it aligned with the
theme's `--rb-color-paper`, `--rb-color-ink`, and `--rb-color-accent` tokens.

```ts
import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const exampleTheme = defineTheme({
  name: "example",
  styles: [
    { moduleSpecifier: "@riebeckite/theme-example/style.css" },
  ],
  settings: defineThemeSettings({
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

`styles[].moduleSpecifier` is a module specifier resolved by the host bundler. It is not a contract for copying filesystem paths into the application.

Pass it to `theme` in the site config:

```ts
export default defineConfig({
  theme: exampleTheme({ colorMode: "system", layout: "article" }),
});
```

The call accepts `ThemeOptions`: `colorMode`, `layout`, `preset`, `settings`, and `stylesheets`. Resolution order is schema defaults, then a preset, then explicit settings.

### 2-1. In-site themes

A theme does not have to be published. Compose an existing theme or define one directly with `defineTheme`, then pass it to `theme`. A theme can live in the site:

```text
site/
└─ extensions/
   ├─ local-theme.ts
   └─ theme.css
```

```ts
// site/extensions/local-theme.ts
import { defineTheme } from "@riebeckite/core";

export const localTheme = defineTheme({
  name: "site-local",
  styles: [
    { moduleSpecifier: "/extensions/theme.css" },
  ],
});
```

An in-site theme uses the same `defineTheme` definition and resolution path as a published theme.

## 7. Theme-specific settings

Do not grow Core's `ThemeOptions` with theme-specific fields. Declare them in the theme's settings schema instead.

```ts
export const newspaperTheme = defineTheme({
  name: "newspaper",
  styles: [
    { moduleSpecifier: "@riebeckite/theme-newspaper/style.css" },
  ],
  settings: defineThemeSettings({
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
});
```

Use the setting when selecting the theme:

```ts
export default defineConfig({
  theme: newspaperTheme({ settings: { density: "compact" } }),
});
```

Settings are reflected as `data-rb-setting-*` attributes and, for color and numeric settings, as `--rb-setting-*` custom properties. Theme-specific settings never leak into Core or other themes.

```text
newspaper density
  -> owned by newspaperTheme's settings schema

tokyonight neon
  -> owned by tokyonightTheme's settings schema
```

## Principles for building a theme

Keep the final boundary:

```mermaid
flowchart LR
    App["Application"]
    Plugin["Plugin"]

    App --> Hooks["Stable Hooks"]
    Plugin --> Hooks

    Core["Core"] --> Tokens["Semantic Tokens"]

    Hooks --> Contract["Presentation Contract"]
    Tokens --> Contract

    Theme["Theme"] --> Contract

    Contract --> Site["Final Site"]
```

A theme does not own the internal structure of the application or plugins. It uses the presentation contract published by the framework and plugins:

```text
Stable CSS Hooks
Semantic Design Tokens
Theme Attributes
CSS Cascade
```

Keep theme-specific settings inside the theme package and out of Core. Changing the theme must not change:

```text
Content
Route
Manifest
Content Graph
Plugin Behavior
Client Behavior
```

**Functionality in plugins, structure in the framework or application, appearance in themes.** With that boundary, you can exchange themes while reusing the same site and plugins.

## Further reading

- [Your First Theme](../themes/writing-a-theme.md) — a step-by-step introduction
- [Theme System](./theme-system.md) — the conceptual contracts
- [Plugin System](./plugin-system.md) — the boundary with themes (features = plugins)
- [Framework Reference](../reference/README.md) — public APIs like `defineTheme`
