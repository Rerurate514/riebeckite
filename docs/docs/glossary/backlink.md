---
title: Backlink
sidebar:
  hidden: true
---

# Backlink

Backlink list rendering showing which published notes link to the current note, using `getPublishedBacklinks()` to resolve incoming links from the content manifest, filtered to publicly discoverable notes and sorted in manifest order.

## Recommended placement

`backlinksPlugin()` registers the data source. Render `<Backlinks />` where the list belongs, normally once after article content. Inside `SiteProvider` and an `Article` carrying its public `entry`, the component resolves incoming links itself.

Without incoming links (or when none are published), the component renders nothing.

## Advanced customization

Pass explicit data with `backlinks`; resolve it with `getBacklinks({ view, slug })`.

```tsx
import { Backlinks, getBacklinks } from "@riebeckite/plugin-backlinks";

const backlinks = await getBacklinks({ view, slug });

return (
  <aside>
    <Backlinks backlinks={backlinks} />
  </aside>
);
```

## Configuration

```ts
plugins: [backlinksPlugin()];
```

Enable the plugin and render the component once. Remove the element to remove the UI.

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
