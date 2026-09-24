# Theme authoring

Riebeckite themes are presentation-only. They customize appearance with CSS, semantic tokens, stable hooks, and optional `data-*` attributes. They do not replace components, change routes, run client scripts, transform DOM, or register plugins.

## Minimal theme

```ts
import { defineTheme } from "@riebeckite/core";

export function minimalTheme() {
  return defineTheme({
    name: "minimal",
    styles: [{ moduleSpecifier: "riebeckite-theme-minimal/theme.css" }],
  });
}
```

```ts
export default defineConfig({
  theme: minimalTheme(),
});
```

## Contract

Theme authors can use:

1. `--rb-*` semantic tokens
2. stable CSS hooks
3. normal CSS cascade
4. theme-specific options resolved inside the theme package and exposed as safe `data-*` attributes

Common tokens include colors such as `--rb-color-paper`, `--rb-color-ink`, `--rb-color-accent`, `--rb-color-border`, `--rb-color-code-background`, typography tokens `--rb-font-body`, `--rb-font-heading`, `--rb-font-mono`, and layout tokens `--rb-space-*`, `--rb-layout-page-max`, `--rb-layout-article-max`, `--rb-layout-sidebar`, `--rb-layout-gap`.

Stable hooks include `.rb-site`, `.rb-article`, `.rb-article-layout`, `.rb-article-header`, `.rb-article-body`, `.rb-article-meta`, and plugin roots such as `.rr-search`, `.rr-callout`, `.rr-table-of-contents`, `.rr-backlinks`, `.rr-local-graph`, `.rr-code`, `.rr-code-tabs`, `.rr-lightbox`, and `.rr-excalidraw`.

Plugin-specific variables belong to plugins. Themes may override them through the plugin root hook, for example:

```css
.rr-search {
  --rr-search-surface: var(--rb-color-paper);
  border-radius: 0;
}
```

CSS order is: app structural CSS, plugin default CSS, theme CSS, config token inline style, then `userCss`.

Theme attributes are limited to `data-*`; Riebeckite-owned attributes such as `data-theme`, `data-theme-name`, `data-typography`, and `data-article-layout` cannot be replaced by theme metadata.
