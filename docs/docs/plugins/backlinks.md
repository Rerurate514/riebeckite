---
date: 2026-10-06
title: Backlinks
---
# Backlinks

Backlink list rendering for articles: shows which published notes link to the
current note.

[日本語](./backlinks.ja.md)

## Live example

Open [Backlink](/docs/glossary/backlink) to see the rendered Backlinks section at the bottom of an article that other pages link to.

## Recommended placement
`backlinks()` provides a `getBacklinks({ view, slug })` helper that returns
`readonly ArticleBacklink[]` (`{ slug, permalink, title }`) and a `<Backlinks
backlinks={...} />` component that renders a `<footer class="rr-backlinks">` with
an eyebrow label and a list of links. The Site places the `<Backlinks />`
component itself, normally once after article content. `getBacklinks()` resolves
the incoming links of a note from the content manifest, keeps only publicly
discoverable notes, and returns them sorted in manifest order. Backlinks are
scoped to the note's language; a translated note does not list the other
language's backlinks.

Without incoming links (or when none of them are published), the component
renders nothing.

## Installation

```sh
npm install @riebeckite/plugin-backlinks
```

## Quick Start

```ts
import { defineConfig } from "@riebeckite/core";
import { backlinks } from "@riebeckite/plugin-backlinks";

export default defineConfig({
  // ...
  plugins: [backlinks()],
});
```

`backlinks()` provides the `getBacklinks({ view, slug })` helper and the
`<Backlinks />` component, and bundles `style.css` into the app
stylesheet. Render `<Backlinks />` once in the article layout; without a
`backlinks` prop it resolves the list from the Site and Article context. The
official Starter already renders this component.

## Advanced customization

To place the component in a custom location, render `<Backlinks />` there, or
await `getBacklinks({ view, slug })` in an async component and pass the result
as the optional `backlinks` prop exactly once. The data resolver does not change
backlink data or its publication filtering.

```tsx
import { Backlinks, getBacklinks } from "@riebeckite/plugin-backlinks";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";

async function ArticleFooter() {
  const site = useSiteContext();
  const article = useArticleContext();
  if (!site || !article?.entry) return null;
  const backlinks = await getBacklinks({
    view: site.view,
    slug: article.entry.slug,
  });
  return (
    <aside><Backlinks backlinks={backlinks} /></aside>
  );
}
```

## Configuration

There are no plugin options for `backlinks`. The `Backlinks` component accepts
an optional `backlinks` prop; when omitted, it resolves the list from context.
Set `borders={{ items: false }}` to remove the rule between backlink items.

## Component

`Backlinks({ backlinks, borders })` renders a `<footer class="rr-backlinks">`
with an eyebrow label and a list of links to each backlink's resolved
`permalink`. With `borders={{ items: false }}`, the footer also carries
`rr-backlinks--without-item-borders`.

## Exports

- `backlinks()` — plugin factory
- `Backlinks` — list component (named export)
- `getBacklinks({ view, slug })` — resolves published backlinks for a slug
  (`{ slug, permalink, title }` each); may return a promise
- Type: `ArticleBacklink` (`{ slug, permalink, title }`)

## See also

- [Plugin guide](../reference/plugin-api.md)
- [`@riebeckite/plugin-local-graph`](./local-graph.md)
- [`@riebeckite/plugin-garden-explorer`](./garden-explorer.md)
