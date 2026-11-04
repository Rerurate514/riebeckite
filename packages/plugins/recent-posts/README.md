# @riebeckite/plugin-recent-posts

<!-- Generated from docs/docs/plugins/recent-posts.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Recent posts list rendering: shows the latest published notes sorted by
frontmatter date.

[日本語](./README_ja.md)

## Live example

The Recent posts list on the [home page](/) is rendered by this plugin from the site's published entries.

## Overview

`RecentPosts` renders an ordered list of recently posted articles.
`getRecentPosts()` reads
`manifest.discoverableEntries`, so `unlisted`, `draft`, and scheduled notes are
excluded. It derives a date from the frontmatter (`date` falling back to
`created`), sorts newest first, and truncates to `limit` items. Notes without a
parseable date are dropped. Official `starter` and `showcase` sites place the
list in the shared `app/components/article.tsx`, so it appears on the home page
and on content pages.

With no posts, the component renders nothing.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { recentPosts } from "@riebeckite/plugin-recent-posts";

export default defineConfig({
  // ...
  plugins: [recentPosts()],
});
```

`recentPosts()` registers the plugin in the plugin list and bundles
`style.css` into the app stylesheet; it never renders UI itself. The generated
`starter` and `showcase` demonstrate the recommended placement in the shared
`app/components/article.tsx`.

### Custom placement

```tsx
import { RecentPosts, getRecentPosts } from "@riebeckite/plugin-recent-posts";
import { content } from "virtual:riebeckite/content";

const recentPosts = getRecentPosts({ manifest: await content.getManifest() });

// ...in a homepage route or site-owned layout
return <RecentPosts posts={recentPosts} />;
```

`getRecentPosts()` filters out the `index` note before collecting posts.
To disable the generated list, remove its `RecentPosts` import and element from
`app/components/article.tsx`. To reposition it, move that same element to
another component, route, or layout.

## Component

`RecentPosts({ posts })` renders a
`<section class="rr-recent-posts">` with a heading and an ordered
list. Each item links to the post and shows its date formatted for the Site
language (`site.language`), falling back to `en-US`. The `rr-recent-posts` root
hook is the stable class themes may target.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `manifest` | `Pick<ContentManifest, "discoverableEntries">` | — | Source of candidate posts |
| `limit` | `number` | `5` | Maximum number of posts to return |
| `locale` | `ContentLocalePolicy` | なし | Optional locale policy for the returned posts |
## Exports

- `recentPosts()` — plugin factory
- `RecentPosts` — list component (default export of `components/recent-posts.tsx`)
- `getRecentPosts({ manifest, limit? })` — collects the latest discoverable
  posts
- Type: `RecentPost` (`{ slug, permalink, title, postedAt }`)

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
