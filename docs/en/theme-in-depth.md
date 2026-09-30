# Themes in Depth

[Your First Theme](./theme-tutorial.md) is a short walkthrough that gets a theme running. This page is its "in depth" companion: it collects everything you refer to while building a theme — options, tokens, hooks, the CSS cascade, and packaging.

If you are new, read [your first theme](./theme-tutorial.md) first, and use this page when you want more detail. For the conceptual contracts, see [Theme System](./theme-system.md).

## 1. What a theme can and cannot do

A theme is the **presentation layer**. It changes tokens, stylesheet rules, and theme-specific `data-*` attributes. It does not change content semantics or application structure.

| Can | Cannot |
| --- | --- |
| Override or add tokens | Component replacement |
| Define stylesheet rules | JSX injection |
| Declare theme-specific `data-*` attributes | Route additions |
| Declare color mode / typography / layout presets | Adding or removing plugins |
| Provide the final override through `userCss` | Client script execution |
| Style stable hooks | DOM transformation, island registration, filesystem access, ContentManager access |

Keep the boundary: do not write a plugin just to change appearance, and do not extend a theme to add features. Features go in plugins, plain appearance in themes, and site-specific routes in the app.

## 2. The defineTheme contract

`defineTheme` is imported from `@riebeckite/core`. A theme's main contract has five areas.

| Area | Contents |
| --- | --- |
| Identity | `name` |
| Factory options | `options` |
| Styles | `styles[].moduleSpecifier` |
| Common config | `colorMode`, `typography`, `articleLayout`, `tokens`, `userCss` |
| Attributes | safe `data-*` attributes |

```ts
import { defineTheme } from "@riebeckite/core";

export function exampleTheme() {
  return defineTheme({
    name: "example",
    options: { /* theme-specific options */ },
    styles: [
      { moduleSpecifier: "@riebeckite/theme-example/style.css" },
    ],
    attributes: { "data-example-flag": "on" },
  });
}
```

`styles[].moduleSpecifier` is a module specifier resolved by the host bundler. It is not a contract for copying filesystem paths into the application.

### 2-1. In-site themes

A theme does not have to be published. Compose an existing theme or define one directly with `defineTheme`, then pass it to `theme`.

```ts
// site/extensions/local-theme.ts
import { defineTheme } from "@riebeckite/core";

export function localTheme() {
  return defineTheme({
    name: "site-local",
    styles: [
      { moduleSpecifier: "/extensions/theme.css" },
    ],
    attributes: { "data-site-local": "on" },
  });
}
```

An in-site theme's `name`, `styles`, `attributes`, and `tokens` go through the same `resolveThemeConfig` path (resolution, sanitization, application) as a published theme.

## 3. The common config options

### 3-1. colorMode

```ts
type ThemeColorMode = "light" | "dark" | "system";
```

`"system"` follows the OS preference. Themes use the `data-theme` attribute and semantic tokens, and avoid hardcoding colors into individual components.

At runtime the palette is decided by three CSS states.

```css
:is(:root, .rb-theme-root)[data-theme-name="<name>"] { /* light */ }
:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-theme="dark"] { /* dark */ }
@media (prefers-color-scheme: dark) {
  :is(:root, .rb-theme-root)[data-theme-name="<name>"]:not([data-theme]) { /* follows the OS (system) */ }
}
```

The server emits `data-theme` on `<html>` unless the theme's `colorMode` is `"system"`, in which case the attribute is omitted and the media query decides.

**Runtime switching contract**: set `document.documentElement.dataset.theme` to `"light"` or `"dark"`, or **remove the attribute** for `"system"`. Do not set `data-theme=""`; an empty attribute still matches `[data-theme]` and breaks the media query.

`@riebeckite/plugin-color-mode` is the reference implementation ([README](../../packages/plugins/color-mode/README.md)) — an inline `ColorModeScript` that runs before render, a `ColorModeToggle` control, and an `initColorMode` client entry that saves the choice to `localStorage`.

### 3-2. typography

```ts
type ThemeTypographyPreset = "system" | "serif" | "sans";
```

The preset is reflected in semantic font tokens such as body and heading.

### 3-3. articleLayout

```ts
type ThemeArticleLayoutPreset = "article" | "sidebar" | "full-width";
```

A theme defines the presentation of a layout preset; it does not replace the route or the component tree.

### 3-4. tokens

Core's `ThemeDesignTokens` has the following semantic groups. In stylesheets they are handled as `--rb-*` semantic CSS custom properties.

**Color:**

| Token | CSS variable |
| --- | --- |
| `paper` | `--rb-color-paper` |
| `ink` | `--rb-color-ink` |
| `muted` | `--rb-color-muted` |
| `accent` | `--rb-color-accent` |
| `border` | `--rb-color-border` |
| `borderStrong` | `--rb-color-border-strong` |
| `surface` | `--rb-color-surface` |
| `surfaceHover` | `--rb-color-surface-hover` |
| `overlay` | `--rb-color-overlay` |
| `danger` | `--rb-color-danger` |
| `success` | `--rb-color-success` |
| `codeBackground` | `--rb-color-code-background` |

**Typography:**

| Token | CSS variable |
| --- | --- |
| `bodyFont` | `--rb-font-body` |
| `headingFont` | `--rb-font-heading` |
| `monoFont` | `--rb-font-mono` |

**Layout:**

| Token | CSS variable |
| --- | --- |
| `pageMaxWidth` | `--rb-layout-page-max` |
| `articleMaxWidth` | `--rb-layout-article-max` |
| `sidebarWidth` | `--rb-layout-sidebar` |
| `contentGap` | `--rb-layout-gap` |

```css
@layer base {
  :is(:root, .rb-theme-root)[data-theme-name="<name>"] {
    --rb-color-paper: #fafafa;
    --rb-color-ink: #202020;
    --rb-color-accent: #555;
    --rb-font-body: system-ui, sans-serif;
    --rb-layout-article-max: 48rem;
  }
}
```

Note that the CSS variable names are kebab-case versions of the token names (`borderStrong` → `--rb-color-border-strong`, and so on); the input token name and the CSS variable differ.

**Why semantic tokens**: if components or plugins reference a specific theme's color names directly, the theme can no longer be swapped.

```css
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

Tokens with plugin-specific meaning are owned by the plugin as `--rr-*`, falling back to `--rb-*` when available.

### 3-5. userCss

`userCss` loads last (top of the cascade) and is the final override. It is for sites that want to tweak one thing without forking the theme. Theme stylesheets load before `userCss`, so `userCss` wins.

```ts
theme: defaultTheme({
  userCss: ["/extensions/custom.css"],
}),
```

### 3-6. Theme root selector

Built-in themes do not target the bare `:root`. Every rule is scoped to the
theme's identity name so the same stylesheet can style the real document and
an embedded preview:

```css
:is(:root, .rb-theme-root)[data-theme-name="<name>"]
```

`<name>` is the theme's identity name: `riebeckite` for the default theme,
otherwise one of `minimal`, `gruvbox`, `sakura`, `tokyonight`, `rerurate`.

- On a real site the app sets `data-theme-name` on `<html>`, so the `:root`
  branch matches the document root.
- In a preview such as a theme gallery, the same stylesheet styles any
  element carrying `class="rb-theme-root" data-theme-name="<name>"`, so
  several themes can render side by side in one document.

Light, dark, system, typography, theme options, and element/pseudo rules all
carry the same prefix:

```css
:is(:root, .rb-theme-root)[data-theme-name="<name>"] { /* light */ }
:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-theme="dark"] { /* dark */ }
@media (prefers-color-scheme: dark) {
  :is(:root, .rb-theme-root)[data-theme-name="<name>"]:not([data-theme]) { /* system */ }
}
:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-typography="serif"] { /* typography */ }
:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-tokyonight-neon="on"] { /* theme option */ }
:is(:root, .rb-theme-root)[data-theme-name="<name>"] :focus-visible { /* element/pseudo */ }
```

The app provides `data-theme-name`; a preview container only needs the
`.rb-theme-root` hook and the matching name.

## 4. Color mode, attributes, and options in detail

Beyond the contract in 3-1, theme-specific options can be passed to CSS through safe `data-*` attributes.

```ts
return defineTheme({
  name: "newspaper",
  attributes: {
    "data-newspaper-density": "compact",
  },
});
```

The theme API is not designed to modify `class`, `style`, `id`, or `lang` freely. It keeps the namespace of framework-owned attributes separate from theme-specific ones.

## 5. Stable CSS hooks

Themes target documented stable hooks, not internal markup. There are two class namespaces.

- **`rb-*`** — structural hooks and semantic design tokens provided by the framework. Structural hooks: `.rb-theme-root` (the theme root container), `.rb-site`, `.rb-article`, `.rb-article-layout`, `.rb-article-header`, `.rb-article-body`, `.rb-article-meta`, `.rb-article-footer`, `.rb-sidebar`.
- **`rr-<feature>`** — the root hook on the outermost element rendered by a plugin or feature. Examples: `.rr-search`, `.rr-callout`, `.rr-table-of-contents`, `.rr-backlinks`, `.rr-local-graph`, `.rr-code`, `.rr-code-tabs`, `.rr-lightbox`, `.rr-excalidraw`, `.rr-mermaid`, `.rr-query`, `.rr-cardlink`, `.rr-diff-history`, `.rr-attachment`, `.rr-media`, `.rr-recent-posts`, `.rr-garden-explorer`.

A theme should style only these root hooks and the descendants a plugin documents. BEM elements (`__…`) and modifiers (`--…`) are internal implementation details. Generic helpers such as `.sr-only` are not plugin hooks. Plugins keep legacy classes for backward compatibility, so the same element can carry both `.rr-<feature>` and the old class; target `rr-*` from themes.

### 5-1. Character layer

A theme is not limited to tokens. Within the theme boundary it may style the
stable hooks directly to give a site a visual character.

- Put token definitions inside `@layer base`; put visual character rules
  **unlayered**. The app's structural CSS and plugin CSS are unlayered, so
  unlayered theme rules win over them without `!important`. Never use
  `!important`.
- Target only stable hooks: `.rb-site`, `.rb-article`, `.rb-article-layout`,
  `.rb-article-header`, `.rb-article-body`, `.rb-article-meta`,
  `.rb-article-footer`, `.rb-sidebar`, `.prose`, and the `rr-*` plugin roots
  above. Do not invent new `rb-*` / `rr-*` class names; `.rr-*` BEM parts are
  internal.
- A theme may ship self-hosted webfonts (Latin subsets) in its package under
  `styles/fonts/`, reference them with relative `url()`, and include the font
  license file. Japanese and other CJK text should fall back to system font
  stacks rather than shipping large font files.

```css
/* Tokens stay layered. */
@layer base {
  :is(:root, .rb-theme-root)[data-theme-name="example"] {
    --rb-color-accent: #b45309;
  }
}

/* Character rules are unlayered, so they beat app and plugin CSS. */
:is(:root, .rb-theme-root)[data-theme-name="example"] .rb-article-header {
  border-bottom: var(--rb-rule-width) solid var(--rb-color-border);
}

@font-face {
  font-family: "Example Serif";
  src: url("./fonts/example-serif-latin.woff2") format("woff2");
  font-weight: 400 700;
  font-display: swap;
}
```

Character rules are still presentation-only: they must not change content,
structure, or behavior.

## 6. CSS cascade

Load order is a key contract for presentation extensions.

```text
base / app structural CSS
→ Plugin default CSS
→ Theme CSS
→ config token inline style
→ userCss
```

This order is guaranteed, not incidental. `@riebeckite/honox` generates `.riebeckite/plugin-styles.css` (plugin styles in resolved plugin order) and `.riebeckite/theme-styles.css` (theme styles). The site imports plugin stylesheets before theme stylesheets, so theme CSS always overrides plugin defaults and `userCss` is the final override.

Do not reorder these imports or edit the generated files. Each generated file notes its cascade position in a header comment. The cascade usually does not depend on `!important`.

## 7. Theme factory options

Resolve theme-specific options inside the theme package. Do not grow Core's `ThemeConfig` with them.

```ts
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

Theme-specific options matter only when that theme is selected; they never leak into Core or other themes.

## 8. Packaging for distribution

Use `packages/themes/minimal` as a template.

```text
packages/themes/minimal/
├─ src/index.ts      ← factory that calls defineTheme
├─ styles/theme.css  ← the theme stylesheet
├─ package.json      ← exports ./style.css
├─ README_ja.md
└─ README.md
```

A distributed theme depends only on `@riebeckite/core` and exports its stylesheet as `./style.css`. Never reference monorepo paths. For the package surface and current constraints, see "Public packages and import paths" in [Framework Reference](./framework-reference.md).

## 9. Verify

```sh
npm run check             # validate config and plugin resolution
npm run inspect -- config # inspect the resolved theme
npm run dev               # check the look locally
npm run build             # check the generated output
```

`check` / `doctor` / `inspect` are read-only. Swapping a theme does not change routes, the manifest, the graph, or client behavior. If the look is wrong, check the cascade order (`userCss` last) and whether you are targeting `rr-*` or `rb-*`.

## Further reading

- [Your First Theme](./theme-tutorial.md) — a step-by-step introduction
- [Theme System](./theme-system.md) — the conceptual contracts
- [Plugin System](./plugin-system.md) — the boundary with themes (features = plugins)
- [Framework Reference](./framework-reference.md) — public APIs like `defineTheme`