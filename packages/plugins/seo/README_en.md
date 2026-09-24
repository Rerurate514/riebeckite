# @riebeckite/plugin-seo

SEO metadata, sitemap, robots.txt, and feed generation for Riebeckite.

[日本語](./README_ja.md)

## Overview

`seo()` provides a `PluginSeoExtension` consumed by the Riebeckite app. It
builds per-page SEO metadata and renders `/sitemap.xml`, `/robots.txt`, and
RSS / Atom / JSON feeds.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { seo } from "@riebeckite/plugin-seo";

export default defineConfig({
  // ...
  plugins: [
    seo({
      siteName: "Riebeckite Blog",
      defaultImage: "/ogp.png",
      feed: { rss: true, atom: true, json: true },
      sitemap: true,
      robots: true,
    }),
  ],
});
```

## Options

| Option | Type | Description |
| ------ | ---- | ----------- |
| `siteName` | `string` | Site name used in page titles. Defaults to `site.title`. |
| `defaultImage` | `string` | Default OG image. Falls back to `site.defaultOgImage`. |
| `feed` | `{ rss?: boolean; atom?: boolean; json?: boolean }` | Feed output settings. |
| `sitemap` | `boolean` | Sitemap output settings. |
| `robots` | `boolean` | robots.txt output settings. |

## Generated metadata

### Articles (`buildArticleSeo`)

- `title`: `"{title} | {siteName}"`
- `description`: `frontmatter.description`, otherwise the first 160 characters
  of the post text
- `canonicalUrl`: `frontmatter.canonical`, otherwise the post URL
- `imageUrl`: `frontmatter.ogImage` / `frontmatter.image`, otherwise
  `defaultImage` / `site.defaultOgImage`
- `noindex`: `frontmatter.noindex === true`
- `publishedTime`: `published` / `date` / `created`
- `modifiedTime`: `updated`, falling back to the publish time
- `tags`, `readingTimeMinutes`
- JSON-LD: `BlogPosting` and `BreadcrumbList`

### Websites (`buildWebsiteSeo`)

Title, description, canonical URL, default image, and JSON-LD `WebSite` +
`BreadcrumbList` for index, tag, and other non-article pages.

## Feeds, sitemap, and robots

| Function | Output |
| -------- | ------ |
| `renderSitemap` | `/sitemap.xml` — home page plus published, non-`noindex` entries |
| `renderRobots` | `/robots.txt` — allow all plus sitemap link |
| `renderRssFeed` | RSS 2.0 built from `config.site.feed` |
| `renderAtomFeed` | Atom feed |
| `renderJsonFeed` | JSON Feed 1.1 with `content_html` |

Feed and sitemap entries are filtered with `isPublished`, exclude
`noindex: true`, and are sorted by the most recent update first.

## Reading time

`calculateReadingTime` counts CJK characters (500/min) and Latin words
(220/min), rounding up to at least 1 minute.

## Frontmatter fields

| Field | Use |
| ----- | --- |
| `title` | Article title (falls back to the last slug segment) |
| `description` | Meta description |
| `canonical` | Canonical URL |
| `image` / `ogImage` | OG image |
| `published` / `date` / `created` | Publish time |
| `updated` | Modified time |
| `tags` | Keywords / feed tags |
| `noindex` | `noindex` meta, feed and sitemap exclusion |

## Exports

- `seo(options?)` — plugin factory
- Types: `SeoPluginOptions`, `FeedOptions`, `SeoMetadata`, `WebsiteSeoInput`,
  `RenderableFeedEntry`
- Helpers: `buildArticleSeo`, `buildWebsiteSeo`, `buildAbsoluteUrl`,
  `buildPostUrl`, `getDescription`, `filterFeedEntries`,
  `getEntryPublishedTime`, `getEntryUpdatedTime`, `getHtmlLanguage`,
  `calculateReadingTime`, `renderSitemap`, `renderRobots`, `renderRssFeed`,
  `renderAtomFeed`, `renderJsonFeed`

## See also

- [Plugin guide](../../docs/plugins_en.md)
