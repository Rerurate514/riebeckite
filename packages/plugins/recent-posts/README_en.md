# @riebeckite/plugin-recent-posts

Recent posts list rendering: shows the latest published notes sorted by
frontmatter date.

[日本語](./README_ja.md)

## Overview

`recentPosts()` provides a `RecentPosts` component that renders an ordered list
of recently posted articles. `getRecentPosts()` filters unpublished notes,
derives a date from the frontmatter (`date` falling back to `created`), sorts
newest first, and truncates to `limit` items. Notes without a parseable date
are dropped.

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
import { config } from "../config";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";

const posts = await content.getAllPosts();
const recentPosts = await getRecentPosts({
  posts,
  config,
  getProcessedContent: (slug) => content.getProcessedContent(slug),
  resolveTitle: getArticleTitle,
  limit: 5,
});

// ...in your route
return <Article afterContent={<RecentPosts posts={recentPosts} />} />;
```

`getRecentPosts()` filters out the `index` note before collecting posts.

## Component

`RecentPosts({ posts })` renders a `<section class="recent-posts">` with an
eyebrow label and an ordered list. Each item links to the post and shows its
date formatted for the `ja-JP` locale.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `limit` | `number` | `5` | Maximum number of posts to return |

## Exports

- `recentPostsPlugin()` — plugin factory
- `RecentPosts` — list component (default export of `components/recent-posts.tsx`)
- `getRecentPosts({ posts, config, getProcessedContent, resolveTitle, limit? })`
  — collects the latest published posts
- Type: `RecentPost` (`{ slug, title, postedAt }`)

## See also

- [Plugin guide](../../docs/plugins_en.md)