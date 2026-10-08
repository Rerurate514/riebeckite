# @riebeckite/plugin-recent-posts

Recent posts list rendering: shows the latest published notes sorted by
frontmatter date.

[日本語](./README_ja.md)

## Overview

`recentPosts()` provides a `RecentPosts` component that renders an ordered list
of recently posted articles. `getRecentPosts()` reads
`manifest.discoverableEntries`, so `unlisted`, `draft`, and scheduled notes are
excluded. It derives a date from the frontmatter (`date` falling back to
`created`), sorts newest first, and truncates to `limit` items. Notes without a
parseable date are dropped. Whether and where to place the list is the site's
decision.

With no posts, the component renders nothing.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";

export default defineConfig({
  // ...
  plugins: [recentPostsPlugin()],
});
```

`recentPostsPlugin()` registers the plugin in the plugin list and bundles
`style.css` into the app stylesheet.

### Render the component

```tsx
import RecentPosts, { getRecentPosts } from "@riebeckite/plugin-recent-posts";
import { content } from "../content";

const recentPosts = getRecentPosts({ manifest: await content.getManifest() });

// ...in your route
return <Article afterContent={<RecentPosts posts={recentPosts} />} />;
```

`getRecentPosts()` filters out the `index` note before collecting posts.

## Component

`RecentPosts({ posts })` renders a
`<section class="rr-recent-posts">` with a heading and an ordered
list. Each item links to the post and shows its date formatted for the
`en-US` locale. The `rr-recent-posts` root hook is the stable class themes may
target.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `manifest` | `Pick<ContentManifest, "discoverableEntries">` | — | Source of candidate posts |
| `limit` | `number` | `5` | Maximum number of posts to return |

## Exports

- `recentPostsPlugin()` — plugin factory
- `RecentPosts` — list component (default export of `components/recent-posts.tsx`)
- `getRecentPosts({ manifest, limit? })` — collects the latest discoverable
  posts
- Type: `RecentPost` (`{ slug, permalink, title, postedAt }`)

## See also

- [Plugin guide](../../../docs/docs/reference/plugin-api.md)
