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
import { defineTheme } from "@riebeckite/core";

export function minimalTheme() {
  return defineTheme({
    name: "minimal",
    styles: [{ moduleSpecifier: "@riebeckite/theme-minimal/style.css" }],
  });
}
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

## Design tokens

`ThemeDesignTokens` groups semantic values for colors, typography, and
layout. Themes expose these through shared `--rb-*` CSS custom
properties.

``` css
:root {
  --rb-color-paper: #fafafa;
  --rb-color-ink: #202020;
  --rb-color-accent: #555;
  --rb-font-body: system-ui, sans-serif;
  --rb-layout-article-max: 48rem;
}
```

Components and plugins should consume semantic tokens instead of
hard-coding a specific theme palette. Plugin-specific semantics remain
owned by the plugin and may fall back to `--rb-*` tokens.

## Styles and attributes

Theme styles are bundler-resolved module specifiers. Theme-specific
options can be exposed to CSS through namespaced `data-*` attributes.
Theme-specific concepts should remain inside the theme package rather
than expanding Core `ThemeConfig`.

## Stable CSS hooks

Themes target documented stable hooks instead of internal markup. Riebeckite
uses two class namespaces:

- `rb-*` — framework structural hooks and semantic design tokens. Structural
  hooks include `.rb-site`, `.rb-article`, `.rb-article-layout`,
  `.rb-article-header`, `.rb-article-body`, `.rb-article-meta`,
  `.rb-article-footer`, and `.rb-sidebar`.
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
fall back to the semantic `--rb-*` tokens. See [Plugin System](./plugin-system.md#css-hooks)
for the plugin-side rule.

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
each carries a header comment stating its position in the cascade.

## Theme vs Plugin

Themes own appearance, semantic tokens, stable-hook styling, and
presentation attributes. Plugins own transformations, renderers, client
behavior, endpoints, diagnostics, and SEO extensions.

Themes must not replace components, inject JSX, add routes, add/remove
plugins, execute client scripts, transform the DOM, register islands,
access the filesystem, or use ContentManager.

## Suggested package layout

``` text
packages/themes/example/
├─ index.ts
├─ package.json
├─ style.css
├─ README_ja.md
└─ README_en.md
```

## Distributing a Theme outside this repository

An external Theme package depends only on `@riebeckite/core`, uses `defineTheme`,
and exposes its stylesheet through a `./style.css` export. Do not reference
monorepo paths. See
[Public packages and import paths](./framework-reference.md#public-packages-and-import-paths)
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
