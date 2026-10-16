# @riebeckite/plugin-backlinks

<!-- Generated from docs/docs/plugins/backlinks.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Backlink list rendering for articles: shows which published notes link to the
current note.

[日本語](./README_ja.md)

## Recommended placement
`backlinksPlugin()` provides a `getBacklinks({ view, slug })` helper that returns
`readonly ArticleBacklink[]` (`{ slug, permalink, title }`) and a `<Backlinks
backlinks={...} />` component that renders a `<footer class="rr-backlinks">` with
an eyebrow label and a list of links. The Site places the `<Backlinks />`
component itself, normally once after article content. `getBacklinks()` resolves
the incoming links of a note from the content manifest, keeps only publicly
discoverable notes, and returns them sorted in manifest order.

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
`<Backlinks backlinks={getBacklinks({ view, slug })} />` once in the article
layout to display it. The official Starter already renders this component.

## Advanced customization

To place the component in a custom location, call `getBacklinks({ view, slug })`
in the Site route and render the `<Backlinks backlinks={...} />` component exactly
once. The data resolver does not change backlink data or its publication
filtering.

```tsx
import Backlinks, { getBacklinks } from "@riebeckite/plugin-backlinks";
import { content } from "virtual:riebeckite/content";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const backlinks = getBacklinks({ view, slug, resolveTitle: getArticleTitle });

return (
  <aside><Backlinks backlinks={backlinks} /></aside>
);
```

## Configuration

There are no plugin options for `backlinksPlugin`. The `Backlinks` component
accepts `backlinks` as a required prop.

## Component

`Backlinks({ backlinks })` renders a `<footer class="rr-backlinks">` with
an eyebrow label and a list of links to each backlink's resolved `permalink`.

## Exports

- `backlinksPlugin()` — plugin factory
- `Backlinks` — list component (default export of `components/backlinks.tsx`)
- `getBacklinks({ view, slug })` — resolves published backlinks for a slug
  (`{ slug, permalink, title }` each)
- Type: `ArticleBacklink` (`{ slug, permalink, title }`)

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [`@riebeckite/plugin-local-graph`](../local-graph/README.md)
- [`@riebeckite/plugin-garden-explorer`](../garden-explorer/README.md)
