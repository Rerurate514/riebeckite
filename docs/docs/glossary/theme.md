---
title: Theme
sidebar:
  hidden: true
---

# Theme

A theme controls the presentation layer of a Riebeckite site — colors, typography, spacing, layout, and article style — without changing content semantics or application structure.

## Theme contract

A theme is created with `defineTheme` from `@riebeckite/core` and exposes five areas: identity, factory options, styles, common config (`colorMode`, `typography`, `articleLayout`, `tokens`, `userCss`), and safe data attributes.

```ts
import { defineTheme } from "@riebeckite/core";
export function exampleTheme() {
  return defineTheme({
    name: "example",
    options: {},
    styles: [{ moduleSpecifier: "@riebeckite/theme-example/style.css" }],
    attributes: { "data-example-flag": "on" },
  });
}
```

## Color mode

Themes support three color modes: `light`, `dark`, and `system`.
`system` follows the OS preference and omits the `data-theme` attribute.
The server emits `data-theme` on `<html>` for `light` or `dark` modes.
At runtime, set `document.documentElement.dataset.theme = "dark"` or remove the attribute for `system`.

Do not set `data-theme=""` — an empty attribute breaks the system media query.

## Presentation boundary

A theme does not change content meaning, routes, manifests, plugin behavior, or client scripts.
Functionality belongs in plugins; appearance belongs in themes; site structure belongs in the application.
Swapping themes must not affect content, routes, or plugin behavior.

## Theme configuration resolution

The theme configuration is resolved through `resolveThemeConfig` in `packages/core/src/config.ts`. The function handles two theme input forms:

- **`RiebeckiteTheme`** (with `styles`, `config`, `attributes`): Extracts `name`, spreads `config` for `colorMode`, `typography`, `articleLayout`, `tokens`, and merges `attributes`. Styles are taken from the `styles` array.
- **`ThemeConfig`** (plain object): Used as-is with defaults applied for missing fields. Defaults include `colorMode: "system"`, `typography: "system"`, `articleLayout: "article"`, `tokens: {}`, and `styles: [defaultThemeStyle]`.

The resolved theme is stored in the resolved config under the `theme` key and includes `name`, `colorMode`, `typography`, `articleLayout`, `tokens`, `attributes` (sanitized to allow only `data-*` attributes not reserved), and `userCss`. This resolved theme is then consumed by the pipeline and CSS/HTML generators to produce the final presentation.

## Theme Name and CSS Scoping
The theme's `name` field propagates as the `data-theme-name` attribute on `<html>`, which CSS uses to scope rules via the selector `:is(:root, .rb-theme-root)[data-theme-name="<name>"]`. This enables multiple themes to render side by side in preview environments without style leakage.

## Resolved Theme Structure
The resolved theme object from `resolveThemeConfig` in `packages/core/src/config.ts` contains `name`, `colorMode`, `typography`, `articleLayout`, `tokens`, `attributes`, `userCss`, and `styles`. This resolved theme is stored under the `theme` key in the overall resolved config and consumed by the pipeline and CSS/HTML generators.

## Related terms

- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]
- [[css-contract|CSS Contract]]
- [[glossary/theme-root|Theme Root]]
- [[presentation-layer|Presentation Layer]]

## Learn more

- [Theme System](../framework/theme-system.md)
