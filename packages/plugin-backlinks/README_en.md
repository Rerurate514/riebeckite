# @riebeckite/plugin-backlinks

Backlink list rendering for articles: shows which published notes link to the
current note.

[日本語](./README_ja.md)

## Overview

`backlinks()` provides a `Backlinks` component that renders a footer list of
incoming links. `getPublishedBacklinks()` resolves the incoming links of a
note from the content manifest, keeps only notes whose `frontmatter` passes
`isPublished`, and returns them sorted in manifest order.

Without incoming links (or when none of them are published), the component
renders nothing.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";

export default defineConfig({
  // ...
  plugins: [backlinksPlugin()],
});
```

`backlinksPlugin()` registers the plugin in the plugin list and bundles
`style.css` into the app stylesheet.

### Render the component

```tsx
import Backlinks, { getPublishedBacklinks } from "@riebeckite/plugin-backlinks";
import { config } from "../config";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const backlinks = getPublishedBacklinks({
  manifest,
  config,
  slug,
  resolveTitle: getArticleTitle,
});

// ...in your route
return (
  <Article
    footerContent={<Backlinks backlinks={backlinks} />}
  />
);
```

## Component

`Backlinks({ backlinks })` renders a `<footer class="article-backlinks">` with
an eyebrow label and a list of links to each backlink's slug.

## Exports

- `backlinksPlugin()` — plugin factory
- `Backlinks` — list component (default export of `components/backlinks.tsx`)
- `getPublishedBacklinks({ manifest, config, slug, resolveTitle })` — resolves
  published backlinks for a slug
- Type: `ArticleBacklink` (`{ slug, title }`)

## See also

- [Plugin guide](../../docs/plugins_en.md)
- [`@riebeckite/plugin-local-graph`](../plugin-local-graph/README_en.md)
- [`@riebeckite/plugin-garden-explorer`](../plugin-garden-explorer/README_en.md)