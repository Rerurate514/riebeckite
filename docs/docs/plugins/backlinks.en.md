<!-- Generated from packages/plugins/backlinks/README.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Backlinks

Backlink list rendering for articles: shows which published notes link to the
current note.

[日本語](./backlinks.md)

## Overview

`backlinksPlugin()` appends a footer list of incoming links to the
`article.footer` body slot. `getPublishedBacklinks()` resolves the incoming
links of a note from the content manifest, keeps only publicly discoverable
notes, and returns them sorted in manifest order.

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

`backlinksPlugin()` adds backlinks for every public entry with published
incoming links and bundles `style.css` into the app stylesheet. Render the
`article.footer` body slot in the article layout to display the list.

### Custom placement

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

return (
  <Article
    footerContent={<Backlinks backlinks={backlinks} />}
  />
);
```

## Component

`Backlinks({ backlinks })` renders a `<footer class="article-backlinks rr-backlinks">` with
an eyebrow label and a list of links to each backlink's resolved `permalink`.

## Exports

- `backlinksPlugin()` — plugin factory
- `Backlinks` — list component (default export of `components/backlinks.tsx`)
- `getPublishedBacklinks({ manifest, config, slug, resolveTitle })` — resolves
  published backlinks for a slug
- Type: `ArticleBacklink` (`{ slug, permalink, title }`)

## See also

- [Plugin guide](../reference/plugin-api.en.md)
- [`@riebeckite/plugin-local-graph`](./local-graph.en.md)
- [`@riebeckite/plugin-garden-explorer`](./garden-explorer.en.md)
