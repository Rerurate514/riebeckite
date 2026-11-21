# Application component reference

## Choose the right boundary

| Need | Owner |
| --- | --- |
| Existing reusable Riebeckite feature | Official Plugin |
| Shared colors, spacing, typography, or component presentation | Theme |
| Site-specific page, interaction, or route | Application code |
| Markdown or content semantics | Plugin or content configuration |

Check `riebeckite.config.ts`, the active Theme, and installed Plugins before adding a component. Do not recreate Plugin behavior in an application component.

## Route and UI safety

Keep a route's public URL, parameters, and error state explicit. A visual change must not silently change published content, redirects, or canonical URLs. Use semantic controls and labels; preserve keyboard operation, visible focus, narrow layouts, and reduced-motion preferences.

Use the site's existing component and CSS conventions. Theme-owned visual tokens and hooks remain stable; application code may compose them but must not redefine framework `rb-*` contracts.

## Verification

Run `npm run check` and `npm run build`. Inspect all affected routes at narrow and wide widths, with keyboard navigation, and in light/dark modes when the component uses theme tokens. Add focused tests when behavior branches on route data, user input, or loading/error state.
