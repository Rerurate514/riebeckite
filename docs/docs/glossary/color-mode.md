---
date: 2026-10-14
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

## Theme Config
The `colorMode` option in the theme config (`packages/core/src/types/theme_config.ts`) resolves to one of `light`, `dark`, or `system`. This option is typically set in the Vite config or theme file:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { reiebeckite } from '@riebeckite/honox'

export default defineConfig({
  plugins: [
    reiebeckite({
      colorMode: 'dark', // or 'light' or 'system'
    }),
  ],
})
```

The resolved value drives the `data-theme` attribute on `<html>` and the corresponding `--rb-*` CSS variable overrides.

## `data-theme`/`data-theme-name` CSS Adaptation
The `<html>` element receives `data-theme` and `data-theme-name` attributes based on the resolved mode:

```html
<!-- light mode -->
<html data-theme-name="riebeckite" data-theme="light">

<!-- dark mode -->
<html data-theme-name="riebeckite" data-theme="dark">

<!-- system mode (no data-theme attribute) -->
<html data-theme-name="riebeckite">
```

- `data-theme` (`"light"` or `"dark"`) is used by the CSS to switch color palettes via `[data-theme="light"]` and `[data-theme="dark"]` rules.
- `data-theme-name` is a free-form identifier for the active theme (e.g., `"riebeckite"`), used for targeting theme-specific styles.

## Related terms

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|Semantic Token]]
- [[presentation-layer|Presentation Layer]]

## Learn more

- [Color Mode](../framework/theme-system/color-mode.md)
