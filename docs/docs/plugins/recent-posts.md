<!-- Generated from packages/plugins/recent-posts/README.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Recent Posts

Recent posts list rendering: shows the latest published notes sorted by
frontmatter date.

[日本語](./recent-posts.ja.md)

## Overview

`recentPosts()` provides a `RecentPosts` component that renders an ordered list
of recently posted articles. `getRecentPosts()` reads
`manifest.discoverableEntries`, so `unlisted`, `draft`, and scheduled notes are
excluded. It derives a date from the frontmatter (`date` falling back to
`created`), sorts newest first, and truncates to `limit` items. Notes without a
parseable date are dropped. Official `starter` and `showcase` sites place the
list automatically on their homepage after the page content.

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
`style.css` into the app stylesheet. Generated `starter` and `showcase` sites
need no additional route or layout wiring.

### Custom placement

```tsx
import RecentPosts, { getRecentPosts } from "@riebeckite/plugin-recent-posts";
import { content } from "../content";

const recentPosts = getRecentPosts({ manifest: await content.getManifest() });

// ...in a custom route or layout
return <Article afterContent={<RecentPosts posts={recentPosts} />} />;
```

`getRecentPosts()` filters out the `index` note before collecting posts.
To disable the generated homepage list, remove its `RecentPosts` import and
`afterContent` prop. To reposition it, move that same element to the desired
existing route or layout slot.

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

- [Plugin guide](../reference/plugin-api.md)
