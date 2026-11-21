# Theme reference

## Theme boundary

Create a local Theme with `npm exec riebeckite create theme <name> --register`. A Theme owns typed settings and presentation only. Keep transforms, client behavior, endpoints, and data fetching in a Plugin or the site.

Define Themes with `defineTheme` and settings with `defineThemeSettings`. Every setting needs a label and default; use supported setting types rather than parsing custom values in CSS.

## CSS contract

- Define semantic `--rb-*` tokens in `@layer base`; consume their meaning rather than hard-coded palette values.
- Scope CSS to `:is(:root, .rb-theme-root)[data-rb-theme="<name>"]`.
- Use `data-rb-mode="dark"` for explicit dark mode and `prefers-color-scheme` only when no explicit mode is set.
- Preserve structural `rb-*` hooks. Add `rr-*` hooks only for extensions.
- Keep project-specific final overrides in site CSS, outside Theme layers, intentionally.

Do not copy framework or Plugin implementation CSS into a Theme.

## Validation

Run `npm exec riebeckite theme preview <name>`. Inspect both color modes, narrow and wide layouts, keyboard focus, contrast, overflow, and reduced motion for each changed component state.
