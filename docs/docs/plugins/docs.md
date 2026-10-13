---
title: Docs
---
# Docs

Build-time docs navigation for Riebeckite. The plugin creates a sidebar and
previous/next links from a published Markdown subtree without adding a docs
router or recalculating public URLs from filesystem paths.

[日本語](./docs.ja.md)

## Installation

```sh
pnpm add @riebeckite/plugin-docs
```

## Basic usage

```ts
import { defineConfig } from "@riebeckite/core";
import { docs } from "@riebeckite/plugin-docs";

export default defineConfig({
  plugins: [
    docs({
      root: "docs",
      sidebar: { auto: true },
      prevNext: true,
    }),
  ],
});
```

`root` is the content subtree to treat as docs. With `root: "docs"`, only
content below `content/docs/` is included; notes and blog posts outside that
subtree are left unchanged.

## Frontmatter

```yaml
---
title: Installation
sidebar:
  label: Install
  order: 2
  hidden: false
  collapsed: false
---
```

Supported sidebar metadata:

- `label` — label shown in navigation. Falls back to `title`, then filename.
- `order` — explicit deterministic order. Missing values sort after ordered
  items by title and path.
- `hidden` — removes the page from sidebar and previous/next navigation.
- `collapsed` — exposes collapsed state through `data-docs-collapsed` for theme
  or client enhancement.

All fields are optional. A page without `sidebar` frontmatter still appears in
the navigation: the hierarchy follows the folder structure, the label falls back
to `title`, and the order is title-based. `sidebar` is a Riebeckite extension, so
it lives with the content rather than in the site configuration. Add only the
fields you want to override and leave the rest of the vault untouched.

## Output and theme integration

The plugin publishes semantic HTML fragments through standard article body
slots:

- `article.aside` — docs sidebar
- `article.footer` — previous/next navigation

The sidebar is wrapped in a native `<details>` element whose `<summary>` uses the
sidebar label, so the navigation folds where the summary is visible and stays
expanded on the desktop rail. The markup always ships open; the registered client
entry `initDocsSidebar` closes it while `--rb-docs-sidebar-collapsible` is `1`.
The plugin sets that property to `0` and hides the summary from `88rem` up, so the
desktop rail keeps its previous appearance. Themes can override the property and
the breakpoint.

It ships a small `style.css` with structural defaults only. Themes can target
classes and data attributes such as `rb-docs-sidebar`, `rb-docs-sidebar-details`,
`rb-docs-sidebar-summary`, `aria-current="page"`, `data-docs-level`,
`data-docs-collapsed`, `data-docs-sidebar-details`, `data-docs-previous`, and
`data-docs-next`.

## l10n and publishing

When localization metadata from `@riebeckite/plugin-l10n` is present, each page
receives navigation for the current language only. The plugin always uses the
resolved manifest permalink, so permalink, alias, rename, and l10n URL behavior
remain owned by the content system.

Only published entries are included. Draft, private, excluded, hidden, and
outside-root content does not appear in the sidebar or previous/next sequence.

## Exports

- `docs(options)` / `docsPlugin(options)` — plugin factory
- `buildDocsNavigation(entries, options)` — build the framework-independent model
- `flattenDocsNavigation(items)` — derive the previous/next sequence
- `renderDocsSidebar(...)` and `renderDocsPrevNext(...)` — server HTML renderers
- `initDocsSidebar()` — browser init for the collapsible sidebar (also via
  `@riebeckite/plugin-docs/client`)
- Types: `DocsOptions`, `ResolvedDocsOptions`, `DocsNavigationItem`
