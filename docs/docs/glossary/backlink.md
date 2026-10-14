---
title: Backlink
sidebar:
  hidden: true
---

# Backlink

Backlink list rendering showing which published notes link to the current note, using `getPublishedBacklinks()` to resolve incoming links from the content manifest, filtered to publicly discoverable notes and sorted in manifest order.

## Recommended placement

`backlinksPlugin()` automatically appends a footer list of incoming links to the `article.footer` semantic body slot.

The Site owns physical placement: it displays the list only where it renders that slot, normally once after article content.

Without incoming links (or when none are published), the component renders nothing.

## Advanced customization

To choose a different location, prevent the automatic slot contribution with `render: false`; this does not change backlink data or its publication filtering.

Resolve the data manually:

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
  <aside>
    <Backlinks backlinks={backlinks} />
  </aside>
);
```

## Configuration

```ts
plugins: [backlinksPlugin({ render: false })];
```

Remove the component to remove manually placed UI. Do not render both this component and `article.footer` with automatic rendering enabled, or it will appear twice.

## Backlink data resolution
The `getPublishedBacklinks()` function resolves incoming links from the content manifest. It accepts the following options:

- **manifest**: `ContentManifest` from the content sink
- **config**: `ResolvedRiebeckiteConfig`
- **slug**: the current note's slug
- **resolveTitle**: function to resolve entry titles `(slug: string, title: unknown) => string`

It returns `ArticleBacklink[]` entries, each containing `slug`, `permalink`, and `title`. Links are filtered to publicly discoverable entries only, sorted in manifest order.

```ts
import { getPublishedBacklinks, content } from "@riebeckite/plugin-backlinks";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const backlinks = getPublishedBacklinks({
  manifest,
  config,
  slug: "my-note",
  resolveTitle: getArticleTitle,
});
```

## Related terms

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## Learn more

- [Backlinks](../plugins/backlinks.md)
