# @riebeckite/plugin-backlinks

<!-- Generated from docs/docs/plugins/backlinks.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Backlink list rendering for articles: shows which published notes link to the
current note.

[日本語](./README_ja.md)

## Recommended placement

`backlinksPlugin()` automatically appends a footer list of incoming links to
the `article.footer` semantic body slot. The Site owns physical placement: it
displays the list only where it renders that slot, normally once after article
content. `getPublishedBacklinks()` resolves the incoming links of a note from
the content manifest, keeps only publicly discoverable notes, and returns them
sorted in manifest order.

Without incoming links (or when none of them are published), the component
renders nothing.

## Quick Start

```ts
import { defineConfig } from "@riebeckite/core";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";

export default defineConfig({
  // ...
  plugins: [backlinksPlugin()],
});
```

`backlinksPlugin()` adds backlinks for every public entry with published
incoming links and bundles `style.css` into the app stylesheet. Render
`<ContentSlot slots={bodySlots} name="article.footer" />` once in the article
layout to display it. The official Starter already renders this slot.

## Advanced customization

To choose a different location, prevent the automatic slot contribution with
`render: false`; this does not change backlink data or its publication
filtering. Resolve the data in the Site route and render the public component
exactly once:

```tsx
import Backlinks, { getPublishedBacklinks } from "@riebeckite/plugin-backlinks";
import { content } from "virtual:riebeckite/content";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const backlinks = getPublishedBacklinks({
  manifest,
  config,
  slug,
  resolveTitle: getArticleTitle,
});

return (
  <aside><Backlinks backlinks={backlinks} /></aside>
);
```

```ts
plugins: [backlinksPlugin({ render: false })];
```

Remove the component to remove manually placed UI. Do not render both this
component and `article.footer` with automatic rendering enabled, or it will
appear twice.

## Configuration

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `render` | `boolean` | `true` | Append the generated list to `article.footer`. Set `false` for manual placement. |

## Component

`Backlinks({ backlinks })` renders a `<footer class="rr-backlinks">` with
an eyebrow label and a list of links to each backlink's resolved `permalink`.

## Exports

- `backlinksPlugin()` — plugin factory
- `Backlinks` — list component (default export of `components/backlinks.tsx`)
- `getPublishedBacklinks({ manifest, config, slug, resolveTitle })` — resolves
  published backlinks for a slug
- Type: `ArticleBacklink` (`{ slug, permalink, title }`)

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [`@riebeckite/plugin-local-graph`](../local-graph/README.md)
- [`@riebeckite/plugin-garden-explorer`](../garden-explorer/README.md)
