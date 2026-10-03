# Theme System

Riebeckite Themes are the presentation layer. They change appearance
through shared design contracts rather than replacing application or
plugin functionality.

## Scope before styling

Theme code may change tokens, stylesheet rules, and theme-owned `data-*`
attributes. It cannot change content meaning or application structure. Put
interactive behavior in a plugin or application, and put a visual adjustment
in a theme. This separation lets a site exchange themes without changing its
routes, manifest, graph, or client behavior.

## Minimal theme

``` ts
function minimalTheme() {
  return defineTheme({
    name: "minimal",
    styles: [{ moduleSpecifier: "@riebeckite/theme-minimal/style.css" }],
  });
}
```

On the consuming side, hand it to the config:

``` ts
export default defineConfig({
  theme: minimalTheme(),
});
```

## Contract

A theme can provide identity, factory options, stylesheet module
specifiers, common configuration, design tokens, user CSS, and safe
`data-*` attributes.

Common presets include:

``` ts
type ThemeColorMode = "light" | "dark" | "system";
type ThemeTypographyPreset = "system" | "serif" | "sans";
type ThemeArticleLayoutPreset = "article" | "sidebar" | "full-width";
```

## Typography

A typography preset is reflected in the semantic font tokens for body
and heading text:

``` ts
type ThemeTypographyPreset = "system" | "serif" | "sans";
```

## Article Layout

A theme defines the presentation of each layout preset; it never replaces
routes or the component tree:

``` ts
type ThemeArticleLayoutPreset = "article" | "sidebar" | "full-width";
```

## Design tokens

`ThemeDesignTokens` groups semantic values for colors, typography, and
layout. Themes expose these through shared `--rb-*` CSS custom
properties.

### Color

`paper`, `ink`, `muted`, `accent`, `border`, `borderStrong`, `surface`,
`surfaceHover`, `overlay`, `danger`, `success`, and `codeBackground`.

### Typography

`bodyFont`, `headingFont`, and `monoFont`.

### Layout

`pageMaxWidth`, `articleMaxWidth`, `sidebarWidth`, and `contentGap`.

``` css
@layer base {
  /* <name> is the theme's identity name, for example "minimal". */
  :is(:root, .rb-theme-root)[data-theme-name="<name>"] {
    --rb-color-paper: #fafafa;
    --rb-color-ink: #202020;
    --rb-color-accent: #555;
    --rb-font-body: system-ui, sans-serif;
    --rb-layout-article-max: 48rem;
  }
}
```

Components and plugins should consume semantic tokens instead of
hard-coding a specific theme palette:

``` css
/* good */
.rr-example {
  color: var(--rb-color-ink);
  background: var(--rb-color-surface);
}

/* avoid */
.rr-example {
  color: #171717;
  background: #f6efe2;
}
```

Plugin-specific semantics remain owned by the plugin and may fall back to
`--rb-*` tokens.

## Theme root selector

Built-in themes do not target the bare `:root` selector. Each theme scopes
its rules to a *theme root* so the same stylesheet can style the real
document and an embedded preview:

``` css
:is(:root, .rb-theme-root)[data-theme-name="<name>"]
```

`<name>` is the theme's identity name: `riebeckite` for the default theme,
otherwise `minimal`, `gruvbox`, `sakura`, `tokyonight`, or `rerurate`.

- On a real site the application sets `data-theme-name` on `<html>`, so the
  `:root` branch matches the document root.
- In a preview (for example a theme gallery), the same stylesheet styles any
  element that carries `class="rb-theme-root" data-theme-name="<name>"`.
  Several themes can therefore render side by side in one document.

Every selector a theme declares carries the same prefix:

``` css
/* light */
:is(:root, .rb-theme-root)[data-theme-name="<name>"] { /* ... */ }

/* dark */
:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-theme="dark"] {
  /* ... */
}

/* system */
@media (prefers-color-scheme: dark) {
  :is(:root, .rb-theme-root)[data-theme-name="<name>"]:not([data-theme]) {
    /* ... */
  }
}

/* typography preset */
:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-typography="serif"] {
  /* ... */
}

/* theme option */
:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-tokyonight-neon="on"] {
  /* ... */
}
```

Element and pseudo-element rules use the same prefix so they stay inside the
preview container:

``` css
:is(:root, .rb-theme-root)[data-theme-name="<name>"] :focus-visible { /* ... */ }
:is(:root, .rb-theme-root)[data-theme-name="<name>"] ::selection { /* ... */ }
:is(:root, .rb-theme-root)[data-theme-name="<name>"] * { /* ... */ }
```

The framework emits `data-theme-name`; a preview container only needs the
`.rb-theme-root` hook and the matching name.

## Styles

Theme styles are bundler-resolved module specifiers; this is not a
contract for copying filesystem paths into the application:

``` ts
styles: [
  { moduleSpecifier: "@riebeckite/theme-example/style.css" },
]
```

## Attributes

Theme-specific options can reach CSS through safe `data-*` attributes:

``` ts
return defineTheme({
  name: "newspaper",
  attributes: {
    "data-newspaper-density": "compact",
  },
});
```

Do not turn `class`, `style`, `id`, or `lang` into settable theme
attributes, and keep the framework-owned attribute namespace separate
from theme-specific ones.

## Theme factory options

Resolve theme-specific options inside the theme package:

``` ts
type NewspaperOptions = {
  density?: "compact" | "comfortable";
};

export function newspaperTheme(options: NewspaperOptions = {}) {
  return defineTheme({
    name: "newspaper",
    options,
    attributes: {
      "data-newspaper-density": options.density ?? "comfortable",
    },
    styles: [
      { moduleSpecifier: "@riebeckite/theme-newspaper/style.css" },
    ],
  });
}
```

Keep theme-specific concepts inside the theme package rather than
expanding Core `ThemeConfig`.

## Color mode at runtime

Themes derive their palette from three CSS states:

- `:is(:root, .rb-theme-root)[data-theme-name="<name>"]` — light
- `:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-theme="dark"]` — dark
- `@media (prefers-color-scheme: dark) { :is(:root, .rb-theme-root)[data-theme-name="<name>"]:not([data-theme]) }` — follow the OS ("system")

The server writes `data-theme` on `<html>` unless the theme's `colorMode` is
`"system"`, in which case the attribute is omitted and the media query picks
the palette. Runtime switching follows the same contract: set
`document.documentElement.dataset.theme` to `"light"` or `"dark"`, or **remove**
the attribute for `"system"`. An empty attribute is not equivalent — an empty
`data-theme` still matches `[data-theme]` selectors and defeats the media
query.

`@riebeckite/plugin-color-mode` is the reference implementation of this
contract: `ColorModeScript` (a before-paint inline script), `ColorModeToggle`
(a control), and an `initColorMode` client entry that persists the choice in
`localStorage`. See its
[`README`](../../../../packages/plugins/color-mode/README.md).

## Stable CSS hooks

Themes target documented stable hooks instead of internal markup. Riebeckite
uses two class namespaces:

- `rb-*` — framework structural hooks and semantic design tokens. Structural
  hooks include `.rb-theme-root` (the theme root container), `.rb-site`,
  `.rb-article`, `.rb-article-layout`, `.rb-article-header`,
  `.rb-article-body`, `.rb-article-meta`, `.rb-article-footer`, and
  `.rb-sidebar`. Navigation uses `.rb-site-header`, `.rb-nav`,
  `.rb-nav__list`, `.rb-nav__item`, `.rb-nav__link`,
  `.rb-nav__link--active`, `.rb-nav__children`, `.rb-nav__mobile`,
  `.rb-nav__toggle`, and `.rb-site-footer`.
- `rr-<feature>` — the root hook a plugin or feature emits on the outermost
  element it renders, for example `.rr-search`, `.rr-callout`,
  `.rr-table-of-contents`, `.rr-backlinks`, `.rr-local-graph`, `.rr-code`,
  `.rr-code-tabs`, `.rr-lightbox`, `.rr-excalidraw`, `.rr-mermaid`,
  `.rr-query`, `.rr-cardlink`, `.rr-diff-history`, `.rr-attachment`,
  `.rr-media`, `.rr-recent-posts`, and `.rr-garden-explorer`.

The root hook is the supported styling surface: a theme restyles a feature by
targeting `.rr-<feature>` and its documented descendants. BEM element
(`__...`) and modifier (`--...`) classes remain internal implementation
details unless a plugin documents them, and generic helper classes such as
`.sr-only` are not plugin hooks. Plugins keep their historical classes for
backward compatibility, so `.rr-<feature>` may appear alongside a legacy class
on the same element; a theme should target the `rr-*` hook.

Plugins may also expose plugin-owned custom properties under `--rr-*` and
fall back to the semantic `--rb-*` tokens. See [Plugin System](./plugin-api.md#css-hooks)
for the plugin-side rule.

## Character layer

A theme is not limited to tokens. Within the theme boundary it may style the
stable hooks directly to give a site a visual character.

- Put token definitions inside `@layer base`; put visual character rules
  **unlayered**. The application's structural CSS and plugin CSS are
  unlayered, so unlayered theme rules win over them without `!important`.
  Never use `!important`.
- Target only stable hooks: `.rb-site`, `.rb-article`, `.rb-article-layout`,
  `.rb-article-header`, `.rb-article-body`, `.rb-article-meta`,
  `.rb-article-footer`, `.rb-sidebar`, `.prose`, and the `rr-*` plugin roots
  listed under [Stable CSS hooks](#stable-css-hooks). Do not invent new
  `rb-*` / `rr-*` class names; `.rr-*` BEM parts are internal.
- A theme may ship self-hosted webfonts (Latin subsets) inside its package
  under `styles/fonts/`, reference them with relative `url()`, and include the
  font license file. Japanese and other CJK text should fall back to system
  font stacks instead of shipping large font files.

Character rules are still presentation-only: they must not change content,
structure, or behavior.

## Cascade

``` text
base / app structural CSS
→ Plugin default CSS
→ Theme CSS
→ config token inline style
→ userCss
```

The order is stable, not incidental. `@riebeckite/honox` generates
`.riebeckite/plugin-styles.css` (plugin styles in resolved plugin order) and
`.riebeckite/theme-styles.css` (theme styles). A site imports the plugin
stylesheet before the theme stylesheet, so the theme CSS always wins the
plugin/theme cascade while preserving `userCss` as the final user override.
Do not reorder those imports, and do not edit the generated files by hand;
each carries a header comment stating its position in the cascade. The
cascade normally does not rely on `!important`.

## Theme vs Plugin

Themes own appearance, semantic tokens, stable-hook styling, and
presentation attributes. Plugins own transformations, renderers, client
behavior, endpoints, diagnostics, and SEO extensions.

Themes must not replace components, inject JSX, add routes, add/remove
plugins, execute client scripts, transform the DOM, register islands,
access the filesystem, or use ContentManager.

Do not create a plugin merely to change appearance, and do not extend a
theme to add functionality.

## Suggested package layout

``` text
packages/themes/example/
├─ index.ts
├─ package.json
├─ style.css
├─ README_ja.md
└─ README.md
```

## Distributing a Theme outside this repository

An external Theme package depends only on `@riebeckite/core`, uses `defineTheme`,
and exposes its stylesheet through a `./style.css` export. Do not reference
monorepo paths. See
[Public packages and import paths](./README.md#public-packages-and-import-paths)
for the supported package surface and current constraints.

Following the shared contract keeps themes replaceable without changing
application logic.

### Site-local themes

A theme can also live in the site. Compose an existing theme or define one
directly with `defineTheme`, then set it as `theme`:

``` ts
// site/extensions/local-theme.ts
import { defineTheme } from "@riebeckite/core";
import { defaultTheme } from "@riebeckite/theme-default";

export function localTheme() {
  const base = defaultTheme({ colorMode: "dark" });
  return defineTheme({
    name: "site-local",
    styles: [
      ...(base.styles ?? []),
      { moduleSpecifier: "/extensions/theme.css" },
    ],
    config: { ...base.config, tokens: { color: { accent: "#c2410c" } } },
    attributes: { "data-site-local": "on" },
  });
}
```

A site-local theme is resolved, sanitized, and applied through the same
`resolveThemeConfig` path as a packaged theme, including its own stylesheet and
`data-*` attributes.

Following the shared contract keeps themes replaceable without changing
application logic. A theme-specific option is meaningful only for that
theme and never leaks into Core or another theme.

## Related

- [Architecture](../framework/architecture.md)
- [Plugin System](./plugin-api.md)
- [Configuration](./configuration.md)
- [Framework Reference](./README.md)

