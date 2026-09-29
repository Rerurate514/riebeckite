# Theme Rules for Agents

Themes are presentation-only packages. They may declare a name, options, styles, theme config, and `data-*` attributes; attribute names must begin with `data-`. Use the semantic color, typography, and layout tokens from the Core theme contract rather than application-specific selectors as the public API.

The stable structural hooks include `.rb-site`, `.rb-article`, `.rb-article-layout`, `.rb-article-header`, `.rb-article-body`, and `.rb-article-meta`. A plugin or feature exposes a stable root hook named `rr-<feature>` (for example `.rr-search`, `.rr-callout`, `.rr-query`, `.rr-code`) on its outermost rendered element, keeping any historical class on the same element for backward compatibility. Themes target `rb-*` structural hooks and `rr-<feature>` root hooks; BEM element/modifier classes and generic helpers such as `.sr-only` are internal. `rb-*` classes and `--rb-*` tokens are framework-owned; plugin-local tokens use `--rr-*` with `--rb-*` fallbacks. Cascade order is base/application structural CSS, plugin defaults, theme CSS, inline config tokens, then `userCss`; the generated `.riebeckite/plugin-styles.css` must be imported before `.riebeckite/theme-styles.css`.

Themes must not replace components, inject JSX, add routes/plugins/client scripts, transform DOM, own islands, access the filesystem, or call ContentManager. Put interactive behavior in a plugin/application and visual styling in the theme.

Theme input may be a raw config or a `defineTheme` result. Supported high-level choices are color mode (`light`, `dark`, `system`), typography (`system`, `serif`, `sans`), and article layout (`article`, `sidebar`, `full-width`).

Color mode is a runtime contract: light is `:root`, dark is `:root[data-theme="dark"]`, and system is the `@media (prefers-color-scheme: dark)` block matched by `:root:not([data-theme])`. Runtime switching sets/removes `data-theme` on `<html>`; an empty attribute breaks the system state. Interactive switching belongs to a plugin (see `@riebeckite/plugin-color-mode`), never to a theme.
