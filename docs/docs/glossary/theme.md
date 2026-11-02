---
date: 2026-10-14
title: Theme
sidebar:
  hidden: true
---

# Theme

A theme controls the presentation layer of a Riebeckite site — colors, typography, spacing, layout, and article style — without changing content semantics or application structure.

## Theme contract

A theme is created with `defineTheme` from `@riebeckite/core`. A definition has an identity (`name`), styles (`styles`), an optional settings schema (`settings`), and optional named presets (`presets`).

```ts
import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const exampleTheme = defineTheme({
  name: "example",
  styles: [{ moduleSpecifier: "@riebeckite/theme-example/style.css" }],
  settings: defineThemeSettings({
    accent: { type: "color", label: "Accent", default: "#176b5a" },
  }),
});
```

## Color mode

Themes support three color modes: `light`, `dark`, and `system`.
`system` follows the OS preference and omits the `data-rb-mode` attribute.
The server emits `data-rb-mode` on `<html>` for `light` or `dark` modes.
At runtime, set `document.documentElement.dataset.rbMode = "dark"` or remove the attribute for `system`.

Do not set `data-rb-mode=""` — an empty attribute breaks the system media query.

## Presentation boundary

A theme does not change content meaning, routes, manifests, plugin behavior, or client scripts.
Functionality belongs in plugins; appearance belongs in themes; site structure belongs in the application.
Swapping themes must not affect content, routes, or plugin behavior.

## Theme configuration resolution

The theme configuration is resolved by `resolveTheme` in `packages/core/src/types/theme_config.ts`. `resolveConfig` calls it with the configured theme instance and a fallback definition. Resolution:

- looks up `options.preset` and rejects an unknown name
- merges preset settings with explicit `settings`
- validates the result against the theme's settings schema and applies defaults
- resolves `colorMode` (default `system`), `layout` (default `article`), `styles`, and `stylesheets`

The resolved theme is stored under the `theme` key of the resolved config. It contains `name`, `colorMode`, `layout`, `styles`, `stylesheets`, and `settings`. The `settings` object holds the resolved `values`, reflected `attributes`, and generated `style`.

## Theme Name and CSS Scoping

The theme's `name` field propagates as the `data-rb-theme` attribute on `<html>`, which CSS uses to scope rules via the selector `:is(:root, .rb-theme-root)[data-rb-theme="<name>"]`. This enables multiple themes to render side by side in preview environments without style leakage.

## Related terms

- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]
- [[css-contract|CSS Contract]]
- [[glossary/theme-root|Theme Root]]
- [[presentation-layer|Presentation Layer]]

## Learn more

- [Theme System](../framework/theme-system.md)
