# Discovery Recipes

Riebeckite does not have a separate "homepage framework". A homepage and the
pages that help readers browse a site are built by combining the Plugins that
already exist: their Page Types, their Markdown blocks, and the `navigation`
config.

This guide collects recipes for the common discovery routes — featured content,
recent posts, an all-posts index, tags, folders, series, and archive — and names
the Plugin and option each one uses. Every recipe works with the public Plugin
API and Core config; none of them needs a new Core feature.

## One rule to remember

Enabling a Plugin registers its pages, but it does **not** add a link to the
Header or Footer. Add the link yourself in `navigation`:

```ts
navigation: {
  header: [
    { label: "Posts", href: "/posts" },
    { label: "Tags", href: "/tags" },
  ],
}
```

Routes are configuration, not constants. The tags index, series list, and
archive each have a base path option, so the example paths below are defaults,
not fixed values. See [Customizing your site](./customizing-your-site.md) for the
Header/Footer model.

## What the starter already gives you

The `starter` preset already registers the pieces most sites need:

- **Recent posts** on the generated homepage (from `recent-posts`).
- **Tags and folders** listing pages from `taxonomy` (`/tags` and `/folders` by
  default).
- **Series** list and landing pages from `series` (`/series` by default).
- **Breadcrumbs** in the article header from `breadcrumbs`.

`query`, `dataview`, `archive`, and `folder-pages` are available as packages but
are not registered by `starter`. Add the Plugin when a recipe needs it; see
[Presets](../getting-started/presets.md) for what each preset includes.

## Recent posts

This one is on by default. The generated `app/routes/index.tsx` collects the
latest posts and renders them after the homepage body:

```tsx
import { RecentPosts, getRecentPosts } from "@riebeckite/plugin-recent-posts";
import { config } from "../config";
import { content } from "../content";

const recentPosts = await getRecentPosts({
  posts: manifest.discoverableEntries,
  config,
  getProcessedContent: (slug) => content.getProcessedContent(slug),
  resolveTitle: (slug, title) => title,
});
```

`getRecentPosts()` defaults to 5 posts, drops unpublished notes and the `index`
note, and sorts by `date` (falling back to `created`). To change the number or
where the list appears, edit the route; passing `limit` overrides the default.
Notes without a parseable date are dropped. There is no `recent-posts` Markdown
block — it is a component the site places.

## Featured content

"Featured" is not a Core concept: it is a frontmatter flag or a tag that you
filter on. Add notes with `featured: true`:

```yaml
---
title: A hand-picked article
featured: true
---
```

Then render them on the homepage with a `query` block. Install and register
`@riebeckite/plugin-query` first (it is not in `starter`):

```ts
plugins: [queryPlugin()],
```

````md
```query
filter:
  frontmatter:
    featured: true
sort:
  field: date
  order: desc
limit: 3
format: list
```
````

A tag works the same way and is easier to apply from Obsidian. Tag notes with
`featured`, then filter on the tag:

````md
```query
filter:
  tags:
    any: [featured]
sort:
  field: date
  order: desc
limit: 3
format: list
```
````

With `@riebeckite/plugin-dataview` you can express the same thing in Dataview
syntax:

````md
```dataview
LIST file.date
FROM #featured
SORT file.date desc
LIMIT 3
```
````

Both `query` and `dataview` run at build time and add no client JavaScript. Note
that links they produce are not added to the content graph, so backlinks are not
created for them.

## An all-posts index

An all-posts page is a `query` with no filter. Give it its own note, for example
`content/posts.md`, and link it from `navigation`:

````md
---
title: All posts
---

# All posts

```query
sort:
  field: date
  order: desc
format: list
excludeSelf: true
```
````

`excludeSelf: true` keeps the `posts` note out of its own list. Use
`format: table` with `columns` to show a table instead:

````md
```query
sort:
  field: date
  order: desc
format: table
columns: [title, date, tags]
excludeSelf: true
```
````

If you prefer a monthly browse instead of a flat list, use the archive recipe
below.

## Tags

`taxonomy` generates a tags index at `tagsBasePath` (default `/tags`) and one
page per tag at `tagsBasePath/<slug>`. It is already registered in `starter`.
Add a Header link so readers can find it:

```ts
navigation: {
  header: [{ label: "Tags", href: "/tags" }],
}
```

Change the prefix when `/tags` clashes with your content:

```ts
taxonomy({ tagsBasePath: "/topics" }),
```

Per-tag RSS, Atom, and JSON feeds are emitted alongside each term page. Use
`folders: false` if you only want tags.

## Folders

There are two folder-shaped routes, and they can be used together:

- `taxonomy` lists notes grouped by folder at `foldersBasePath` (default
  `/folders`), with one page per folder.
- `folder-pages` turns each folder into a landing page at that folder's path
  (for example `/notes/`), and collapses a folder's `README.md` or `index.md`
  into that landing page.

For a folder listing, add the Header link to the taxonomy path:

```ts
navigation: {
  header: [{ label: "Folders", href: "/folders" }],
}
```

Change the prefix with `taxonomy({ foldersBasePath: "/directories" })`. Because
`folder-pages` changes where `README.md` and `index.md` resolve, enable it only
when you want a landing page per folder; it is not registered by `starter`.

## Series

A series is a set of notes that share a `series` frontmatter key. `series` is in
`starter` and already appends previous/next navigation to each part. It also
publishes a list page at `basePath` (default `/series`) and one landing page per
series at `basePath/<name>`:

```yaml
---
title: Part 1
series: Build a thing
series_order: 1
---
```

Link the list from `navigation`:

```ts
navigation: {
  header: [{ label: "Series", href: "/series" }],
}
```

Change the prefix with `series({ basePath: "/guides" })`, or set `basePath: ""`
to turn the generated pages off and render them yourself from the exported
`buildSeriesIndex()` / `renderSeriesIndex()` helpers.

## Archive

`archive` publishes one listing page per month at `basePath/<yyyy>/<mm>` (default
`/archive`) with pagination. Add the Plugin:

```ts
plugins: [archive()],
```

Then link the base path:

```ts
navigation: {
  header: [{ label: "Archive", href: "/archive" }],
}
```

Use `archive({ basePath: "/history", pageSize: 20 })` to change the prefix or
page size. `pageSize: 0` keeps a single page per month.

## Putting it together

A blog-style homepage often combines a few of these:

1. A lead paragraph in `content/index.md`.
2. A `query` block for featured notes.
3. `<RecentPosts />` from the generated homepage route.
4. Header links to `/tags`, `/series`, and `/archive`.

A docs-style site leans on `folder-pages` for section landings and on `series`
for ordered guides. A vault with few nested folders may skip folder pages
entirely. Pick the pieces that match the content you have.

## What this does not need

These recipes deliberately avoid new abstractions. There is no homepage
framework, no Featured API, and no Core discovery registry: featured content,
all-posts indexes, and archive pages are all combinations of existing Plugins,
Markdown blocks, and `navigation`.

## Where to look next

- [Customizing your site](./customizing-your-site.md) — the Header/Footer and body-slot model
- [Presets](../getting-started/presets.md) — which Plugins each preset registers
- [Plugins](../plugins/README.md) — the Plugin catalog
- [Plugin API](../reference/plugin-api.md) — Page Types, body slots, and CSS hooks
