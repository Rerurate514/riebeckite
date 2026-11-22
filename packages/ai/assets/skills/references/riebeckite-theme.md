# Theme guide

A Theme owns shared presentation: layout, typography, colour, spacing, and component styling. It does not own content semantics or runtime behaviour.

## Define a Theme

```ts
import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const localTheme = defineTheme({
  name: "local",
  styles: [{ moduleSpecifier: "@acme/theme-local/style.css" }],
  settings: defineThemeSettings({
    accent: { type: "color", label: "Accent", default: "#b3472f" },
    density: {
      type: "slider",
      label: "Density",
      default: 1,
      min: 0.8,
      max: 1.2,
      step: 0.1,
    },
    serif: { type: "boolean", label: "Use serif", default: false },
  }),
  presets: {
    reading: { label: "Reading", settings: { serif: true } },
  },
});
```

Register it with the site:

```ts
export default defineConfig({
  site: { title: "My site" },
  theme: localTheme({
    colorMode: "system",
    layout: "article",
    preset: "reading",
    settings: { accent: "#cc5500" },
    stylesheets: ["/site.css"],
  }),
});
```

Use the project's actual factory import and option names.

## Settings

Supported setting types:

| Type | Required | Notes |
| --- | --- | --- |
| `color` | `label`, `default` | Exposed as a safe CSS value. |
| `boolean` | `label`, `default` | Reflected as `data-rb-setting-*`. |
| `number` | `label`, `default` | Supports bounds. |
| `slider` | `label`, `default`, `min`, `max`, `step` | Numeric range. |
| `select` | `label`, `default`, `options` | Keep option values stable. |
| `text` | `label`, `default` | Free-form text; escape or validate where used. |

Settings may also declare a description, section, group, light/dark values, or bounds. Resolution order is defaults, then preset, then explicit settings. Unknown keys or values are rejected, so keep configuration in sync with the definition.

Colour, number, and slider settings are reflected as safe `--rb-setting-*` custom properties. Every setting is reflected as `data-rb-setting-*`.

## CSS contract

- Theme roots expose `data-rb-theme` and `data-rb-layout`.
- `data-rb-mode` is present only for explicit light or dark mode; it is omitted in system mode.
- Scope selectors to the Theme root.
- Use semantic `--rb-*` tokens as the public design contract.
- `rb-*` classes and `--rb-*` tokens are framework-owned. Do not rename or redefine them.
- Extension-owned hooks use `rr-*` and `--rr-*`.

Scoped example:

```css
:is(:root, .rb-theme-root)[data-rb-theme="local"] {
  --rb-color-accent: var(--rb-setting-accent);
}

:is(:root, .rb-theme-root)[data-rb-theme="local"][data-rb-setting-serif="true"] {
  --rb-font-body: Georgia, serif;
}
```

Explicit dark mode:

```css
:is(:root, .rb-theme-root)[data-rb-theme="local"][data-rb-mode="dark"] {
  color-scheme: dark;
}
```

System dark mode:

```css
@media (prefers-color-scheme: dark) {
  :is(:root, .rb-theme-root)[data-rb-theme="local"]:not([data-rb-mode]) {
    color-scheme: dark;
  }
}
```

Theme CSS loads after framework and Plugin CSS. Configured `stylesheets` load last. Use that order deliberately; avoid `!important` as a substitute for a scoped token.

## Boundaries

- No content parsing, routing, build hooks, or client-side application logic.
- No direct edits to generated output or dependency packages.
- Do not duplicate a Plugin's component CSS; style the documented hooks instead.
- Site-specific overrides belong in site CSS, not in a reusable Theme.

## Preview and verification

```sh
npm exec riebeckite create theme <name> --register
npm exec riebeckite theme preview <name>
npm exec riebeckite theme preview <name> --port 4321 --no-open
npm run check
npm run build
```

Inspect:

- Light, dark, and system mode.
- Mobile and desktop widths.
- Keyboard focus and skip links.
- Contrast of text, controls, and states.
- Long titles, long words, tables, code blocks, and images.
- Reduced-motion behaviour.
- Every component state affected by a changed token.

## Common failures

| Symptom | Likely cause |
| --- | --- |
| Theme styles do not apply | Selector is not scoped to `data-rb-theme`, or the Theme is not registered. |
| Dark mode is wrong | Explicit and system-mode selectors were conflated. |
| Setting has no effect | Unknown setting key, wrong type, or the CSS consumes the wrong token. |
| Styles leak into other Themes | Unscoped selector or a global class override. |
| Build is fine but contrast is poor | Token values were not tested against real foreground/background pairs. |

## Report

State changed tokens/hooks/settings, modes and viewports tested, preview and build results, and remaining accessibility or visual risk.
