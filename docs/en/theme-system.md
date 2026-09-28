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

Themes may target documented stable presentation hooks such as
`.rb-site`, `.rb-article`, `.rb-article-layout`, `.rb-article-header`,
`.rb-article-body`, and `.rb-article-meta`, plus stable plugin/feature
root hooks.

BEM element classes and helper classes should generally be treated as
internal implementation details.

## Cascade

``` text
base / app structural CSS
→ Plugin default CSS
→ Theme CSS
→ config token inline style
→ userCss
```

This allows themes to override plugin defaults through normal CSS
cascade while preserving `userCss` as the final user override.

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
