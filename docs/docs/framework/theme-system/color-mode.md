---
title: Color mode
sidebar:
  label: Color mode
  order: 10
---

This page is part of [Themes in Depth](../theme-system.md) and covers color mode.

# Color mode

## 3-1. colorMode

```ts
type ThemeColorMode = "light" | "dark" | "system";
```

| Mode | Behavior |
| --- | --- |
| `light` | Light palette |
| `dark` | Dark palette |
| `system` | Follow the OS setting |

`"system"` follows the OS preference. Themes use the `data-theme` attribute and semantic tokens, and avoid hardcoding colors into individual components.

The server emits `data-theme` on `<html>` unless the mode is `"system"`:

```html
<html
  data-theme-name="example"
  data-theme="dark"
>
```

For `"system"` the attribute is not emitted at all:

```html
<html data-theme-name="example">
```

That difference matters. At runtime the palette is decided by three CSS states.

```css
:is(:root, .rb-theme-root)[data-theme-name="<name>"] { /* light */ }
:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-theme="dark"] { /* dark */ }
@media (prefers-color-scheme: dark) {
  :is(:root, .rb-theme-root)[data-theme-name="<name>"]:not([data-theme]) { /* follows the OS (system) */ }
}
```

The server emits `data-theme` on `<html>` unless the theme's `colorMode` is `"system"`, in which case the attribute is omitted and the media query decides.

**Runtime switching contract**: set `document.documentElement.dataset.theme` to `"light"` or `"dark"`, or **remove the attribute** for `"system"`:

```ts
document.documentElement.dataset.theme = "dark";
```

```ts
delete document.documentElement.dataset.theme;
```

Do not set `data-theme=""`:

```ts
document.documentElement.dataset.theme = "";
```

An empty attribute still matches `[data-theme]`, so `:not([data-theme])` no longer holds and the system media query breaks.

`@riebeckite/plugin-color-mode` is the reference implementation (see its package README) — an inline `ColorModeScript` that runs before render, a `ColorModeToggle` control, and an `initColorMode` client entry that saves the choice to `localStorage`.
