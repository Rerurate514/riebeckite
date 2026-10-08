# @riebeckite/plugin-color-mode

<!-- Generated from docs/docs/plugins/color-mode.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Light / dark / system color-mode switching for Riebeckite sites. The control
writes to `data-theme` on `<html>` at runtime, exactly the attribute the
themes' CSS uses to pick a palette — so it works with every built-in theme and
needs no JavaScript in the theme itself.

[日本語](./README_ja.md)

## Overview

Themes derive their palette from three CSS states (see
[theme-system.md](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md)):

- `:root` — light
- `:root[data-theme="dark"]` — dark
- `@media (prefers-color-scheme: dark) { :root:not([data-theme]) }` — follow the OS ("system")

The plugin is a thin runtime switch over that contract:

- `ColorModeScript` — a one-line inline script for `<head>` that applies the
  saved mode **before first paint**, preventing a flash of the wrong theme.
- `ColorModeToggle` — a segmented control with light / dark / system buttons.
- `initColorMode` — the client entry that binds the buttons, persists the
  choice in `localStorage` and keeps the document in sync.

`colorModePlugin()` itself only registers the stylesheet and the client entry;
everything else is delivered through the two components you render in your site
shell.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { colorModePlugin } from "@riebeckite/plugin-color-mode";

export default defineConfig({
  // ...
  plugins: [colorModePlugin()],
});
```

`colorModePlugin()` bundles `style.css` and declares `initColorMode` as a client
entry.

### Render the components

```tsx
import { ColorModeScript, ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { ThemeRoot } from "@riebeckite/honox/ui";

// ...in your renderer
return (
  <ThemeRoot theme={config.theme}>
    <head>
      <ColorModeScript />
      {/* stylesheets, ... */}
    </head>
    <body>
      <header>
        <ColorModeToggle />
      </header>
      {children}
    </body>
  </ThemeRoot>
);
```

`<ColorModeScript />` must be rendered in `<head>` ahead of the stylesheets so
the mode is set before CSS is applied. `<ColorModeToggle />` can go anywhere;
positions in headers and navbars are typical.

### Props

`ColorModeScript`

| Prop | Description |
| ---- | ----------- |
| `storageKey` | localStorage key to read from. Defaults to `riebeckite-color-mode`. |

`ColorModeToggle`

| Prop | Description |
| ---- | ----------- |
| `storageKey` | localStorage key to persist under. Defaults to `riebeckite-color-mode`. |
| `modes` | Modes to offer, in order. Defaults to `["light", "dark", "system"]`. |
| `labels` | Per-mode `aria-label` overrides: `{ light?, dark?, system? }`. |
| `label` | Group `aria-label`. Defaults to `"Color mode"`. |

Anything you configure here must be reflected on both components if you change
the storage key.

## How the mode is decided

1. On first paint, `ColorModeScript` applies the persisted value if it is a
   valid mode (`light`, `dark` or `system`); otherwise it leaves the
   `data-theme` the server already emitted (from your theme's `colorMode`).
2. On load, `initColorMode` repeats the same logic and syncs the buttons'
   `aria-pressed` state.
3. Clicking a button persists the choice and re-applies it immediately.
   `"system"` **removes** the `data-theme` attribute, so the OS preference CSS
   takes over.

Since themes are presentation-only, the SSRed `data-theme` comes from your
theme's `colorMode`. The plugin only overrides it when the visitor has chosen
otherwise.

## CSS hooks

| Hook | Purpose |
| ---- | ------- |
| `rr-color-mode` | Root container of the toggle. |
| `rr-color-mode__button` | A single mode button. |
| `rr-color-mode__icon` | The inline SVG icon. |

The stylesheet uses `--rb-color-*` tokens, so the control follows the active
theme. The root is `display: none` until `initColorMode` (or the inline script)
sets `data-rb-color-mode="ready"` on `<html>`: with JavaScript disabled the
control never appears.

## Accessibility

- The container is a `<fieldset>` whose `<legend>` names the group (rendered
  visually hidden).
- Each button is `type="button"` with an `aria-label` naming its mode; the
  active one carries `aria-pressed="true"` set by the runtime.
- Icons are decorative (`aria-hidden`); labels come from the buttons.
- Transitions are disabled under `prefers-reduced-motion`.

## Events

`initColorMode` dispatches a `CustomEvent` on `document`:

```ts
document.addEventListener("riebeckite:color-mode", (event) => {
  event.detail.mode; // "light" | "dark" | "system"
});
```

Nothing consumes it yet. It exists so integrations (for example re-rendering
diagrams) can follow mode changes in the future.

## Limitations

- Diagram plugins (`d2`, `mermaid`, `vega-lite`) read `data-theme` once at
  initialization. After switching modes they keep their previous palette until
  the page is reloaded. Listening for `riebeckite:color-mode` is the hook for a
  future re-render.
- The inline script is subject to Content-Security-Policy. If your `script-src`
  forbids inline scripts, allow it by nonce or hash.
- `localStorage` access is wrapped in `try/catch`; when storage is unavailable
  the switch still works for the current page but is not persisted.
- Multiple toggles on one page should share the same `storageKey`.

## Exports

- `colorModePlugin()` — plugin factory
- `ColorModeToggle` — the switch component
- `ColorModeScript` — the before-paint inline script component
- `initColorMode` — browser init (also exported by `@riebeckite/plugin-color-mode/client`)
- Constants: `COLOR_MODES`, `COLOR_MODE_STORAGE_KEY`, `COLOR_MODE_EVENT` (and friends)
- Type: `ColorMode`

## See also

- [Theme system](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md)
- [`@riebeckite/plugin-ux`](../ux/README.md)
