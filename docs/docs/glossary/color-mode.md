---
title: Color Mode
sidebar:
  hidden: true
---

# Color Mode

The active color scheme among light, dark, and system. Controlled by the theme's `colorMode` option and the `data-theme` attribute on `<html>`, with runtime switching via JavaScript.

## Modes

`light` — Light palette
`dark` — Dark palette
`system` — Follows the OS preference (prefers-color-scheme media query)

The server emits `data-theme` on `<html>` for `light` or `dark`; the attribute is omitted for `system`.

```html
<html data-theme-name="example" data-theme="dark">
---

<html data-theme-name="example">
```

At runtime: set `document.documentElement.dataset.theme = "dark"` to force dark, or remove the attribute for system.

## Runtime switching

Set `document.documentElement.dataset.theme = "light"` or `"dark"` to switch modes.
Remove the `data-theme` attribute for `system` mode so the OS media query takes over.

```ts
document.documentElement.dataset.theme = "dark";
delete document.documentElement.dataset.theme;
```

Do not set `data-theme=""` — an empty attribute matches `[data-theme]`, breaking the system media query.

## Related terms

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|Semantic Token]]
- [[presentation-layer|Presentation Layer]]

## Learn more

- [Color Mode](../framework/theme-system/color-mode.md)
