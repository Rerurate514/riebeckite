---
date: 2026-09-29
title: Writing a theme
---

# Writing a theme

A theme is a callable definition with a typed settings schema. CSS owns visual tokens and stable `rb-*` / `rr-*` hooks; Core owns validation, resolution, and reflection.

```ts
import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const localTheme = defineTheme({
  name: "local",
  styles: [{ moduleSpecifier: "@acme/theme-local/style.css" }],
  settings: defineThemeSettings({
    accent: { type: "color", label: "Accent", default: "#b3472f" },
    density: { type: "slider", label: "Density", default: 1, min: 0.8, max: 1.2, step: 0.1 },
    serif: { type: "boolean", label: "Use serif", default: false },
  }),
  presets: { reading: { label: "Reading", settings: { serif: true } } },
});
```

Supported settings are `color`, `boolean`, `number`, `slider`, `select`, and `text`. Each requires a `label` and `default`; use `description`, `group`, `section`, `light`, `dark`, bounds, and select options when needed. Core rejects unknown keys and invalid values.

## CSS contract

Scope theme CSS to `:is(:root, .rb-theme-root)[data-rb-theme="local"]`. Explicit modes use `[data-rb-mode="dark"]`; system dark uses `:not([data-rb-mode])` within `@media (prefers-color-scheme: dark)`. Use `data-rb-layout` for layout and `data-rb-setting-*` for schema settings.

```css
:is(:root, .rb-theme-root)[data-rb-theme="local"] { --rb-color-accent: var(--rb-setting-accent); }
:is(:root, .rb-theme-root)[data-rb-theme="local"][data-rb-setting-serif="true"] { --rb-font-body: Georgia, serif; }
```

Theme styles load after framework and plugin styles. Configured `stylesheets` load last. Keep semantic `--rb-*` values stable and do not add runtime behavior to a theme.

See [Theme API](../reference/theme-api.md).