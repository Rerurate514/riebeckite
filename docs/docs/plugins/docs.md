---
date: 2026-10-06
title: Docs
---
# Docs

Build-time docs navigation for Riebeckite. The plugin creates a sidebar and
previous/next links from a published Markdown subtree without adding a docs
router or recalculating public URLs from filesystem paths.

[日本語](./docs.ja.md)

## Live example

This page is a Docs entry. The Documentation sidebar on the right, the previous/next links below the article, and the [Docs index](/docs/) all come from this plugin.

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

The plugin provides React-like JSX components for site integration:

- `<DocsSidebar items={...} currentPermalink? label? />` converts the Docs tree
  to `SidebarNavigation` and renders `nav.rb-docs-sidebar`. Outside an article
  context it resolves the current entry from the site path.
- `<DocsPrevNext previous? next? />` renders `nav.rb-docs-prev-next`

The `initDocsSidebar` client enables independent group disclosure and sidebar
filtering. It reuses the navigation plugin renderer; the navigation plugin never
depends on Docs.

## l10n and publishing

When localization metadata from `@riebeckite/plugin-l10n` is present, each page
receives navigation for the current language only. The plugin always uses the
resolved manifest permalink, so permalink, alias, rename, and l10n URL behavior
remain owned by the content system.

Only published entries are included. Draft, private, excluded, hidden, and
outside-root content does not appear in the sidebar or previous/next sequence.

## Exports

- `docs(options)` / `docs(options)` — plugin factory
- `buildDocsNavigation(entries, options)` — build the framework-independent model
- `flattenDocsNavigation(items)` — derive the previous/next sequence
- `renderDocsSidebar(...)` and `renderDocsPrevNext(...)` — server HTML renderers
- `initDocsSidebar()` — browser init for the collapsible sidebar (also via
  `@riebeckite/plugin-docs/client`)
- Types: `DocsOptions`, `ResolvedDocsOptions`, `DocsNavigationItem`
