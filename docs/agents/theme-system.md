# Theme Rules for Agents

Themes are presentation-only packages. They may declare a name, options, styles, theme config, and `data-*` attributes; attribute names must begin with `data-`. Use the semantic color, typography, and layout tokens from the Core theme contract rather than application-specific selectors as the public API.

The stable structural hooks include `.rb-site`, `.rb-article`, `.rb-article-layout`, `.rb-article-header`, `.rb-article-body`, and `.rb-article-meta`. Cascade order is base/application structural CSS, plugin defaults, theme CSS, inline config tokens, then `userCss`.

Themes must not replace components, inject JSX, add routes/plugins/client scripts, transform DOM, own islands, access the filesystem, or call ContentManager. Put interactive behavior in a plugin/application and visual styling in the theme.

Theme input may be a raw config or a `defineTheme` result. Supported high-level choices are color mode (`light`, `dark`, `system`), typography (`system`, `serif`, `sans`), and article layout (`article`, `sidebar`, `full-width`).
