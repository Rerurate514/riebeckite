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

## Example of Using the Starter Preset

First, write the following in `[slug{.+}].tsx`. Add `post` as an argument to `SiteArticle`.
```tsx title="[slug{.+}].tsx"
const posts = getRecentPosts({ manifest: await content.getManifest() });

return c.render(
      <SiteArticle
        posts={posts}
        post={resolved.post}
        bodySlots={resolved.entry.bodySlots}
        asideContent={<TableOfContents className="rr-table-of-contents--desktop" items={tableOfContents} />}
      />,
    );
```

Add `posts` as an argument to `SiteArticle`.
```tsx title="article.tsx"
export function SiteArticle({
+  posts,
  post,
  bodySlots,
  asideContent,
  afterContent,
  footerContent,
}: {
+  posts: RecentPost[];
  post: PostContent;
  bodySlots?: ContentBodySlots;
  asideContent?: unknown;
  afterContent?: unknown;
  footerContent?: unknown;
}) {
```

Next, add `RecentPosts`.
```tsx title="article.tsx"
{hasSlot(bodySlots, “article.footer”) || footerContent ? (
          <ArticleFooter class="site-article__footer">
+            <RecentPosts posts={posts}></RecentPosts>
            <ContentSlot slots={bodySlots} name="article.footer" />
            {footerContent}
          </ArticleFooter>
        ) : null}
```

Run `npm exec riebeckite dev` to start the server. When you view the actual page, you’ll see “RECENT POSTS” displayed at the bottom of the site.

## Exports

- `recentPostsPlugin()` — plugin factory
- `RecentPosts` — list component (default export of `components/recent-posts.tsx`)
- `getRecentPosts({ manifest, limit? })` — collects the latest discoverable
  posts
- Type: `RecentPost` (`{ slug, permalink, title, postedAt }`)

## Exports

- `recentPostsPlugin()` — plugin factory
- `RecentPosts` — list component (default export of `components/recent-posts.tsx`)
- `getRecentPosts({ manifest, limit? })` — collects the latest discoverable
  posts
- Type: `RecentPost` (`{ slug, permalink, title, postedAt }`)

## See also

- [Plugin guide](../../../docs/docs/reference/plugin-api.md)
