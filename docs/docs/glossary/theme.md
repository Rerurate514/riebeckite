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

## Related terms

- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]
- [[css-contract|CSS Contract]]
- [[glossary/theme-root|Theme Root]]
- [[presentation-layer|Presentation Layer]]

## Learn more

- [Theme System](../framework/theme-system.md)
