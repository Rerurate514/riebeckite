# @riebeckite/plugin-seo

Riebeckite 向け SEO metadata・sitemap・robots.txt・feed 生成 plugin です。

[English](./README_en.md)

## 概要

`seo()` は `PluginSeoExtension` を提供します。Riebeckite アプリはこれを使って
ページごとの SEO metadata を組み立て、`/sitemap.xml`・`/robots.txt`・
RSS / Atom / JSON feed を出力します。

## 使い方

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

## オプション

| オプション | 型 | 説明 |
| ---------- | -- | ---- |
| `siteName` | `string` | ページ title に使う site 名。省略時は `site.title`。 |
| `defaultImage` | `string` | デフォルト OG image。省略時は `site.defaultOgImage`。 |
| `feed` | `{ rss?: boolean; atom?: boolean; json?: boolean }` | feed 出力の設定。 |
| `sitemap` | `boolean` | sitemap 出力の設定。 |
| `robots` | `boolean` | robots.txt 出力の設定。 |

## 生成される metadata

### 記事 (`buildArticleSeo`)

- `title`: `"{title} | {siteName}"`
- `description`: `frontmatter.description`。なければ本文テキストの先頭 160 文字
- `canonicalUrl`: `frontmatter.canonical`。なければ記事 URL
- `imageUrl`: `frontmatter.ogImage` / `frontmatter.image`。なければ
  `defaultImage` / `site.defaultOgImage`
- `noindex`: `frontmatter.noindex === true`
- `publishedTime`: `published` / `date` / `created`
- `modifiedTime`: `updated`。なければ公開日時
- `tags`、`readingTimeMinutes`
- JSON-LD: `BlogPosting` と `BreadcrumbList`

### website ページ (`buildWebsiteSeo`)

index・tag などの記事以外のページ向けに、title・description・canonical URL・
デフォルト image と JSON-LD `WebSite` + `BreadcrumbList` を生成します。

## feed / sitemap / robots

| 関数 | 出力 |
| ---- | ---- |
| `renderSitemap` | `/sitemap.xml` — トップ + 公開済みかつ `noindex` でない entry |
| `renderRobots` | `/robots.txt` — 全許可 + sitemap URL |
| `renderRssFeed` | `config.site.feed` ベースの RSS 2.0 |
| `renderAtomFeed` | Atom feed |
| `renderJsonFeed` | `content_html` 付き JSON Feed 1.1 |

feed / sitemap の entry は `isPublished` で絞り込み、`noindex: true` を除外し、
更新が新しい順に並び替えます。

## 読了時間

`calculateReadingTime` は CJK 文字（500 字/分）と Latin 単語（220 語/分）を
カウントし、切り上げて最低 1 分を返します。

## frontmatter フィールド

| フィールド | 用途 |
| ---------- | ---- |
| `title` | 記事 title（省略時は slug の最後のセグメント） |
| `description` | meta description |
| `canonical` | canonical URL |
| `image` / `ogImage` | OG image |
| `published` / `date` / `created` | 公開日時 |
| `updated` | 更新日時 |
| `tags` | keyword / feed の tag |
| `noindex` | `noindex` meta、feed・sitemap からの除外 |

## エクスポート

- `seo(options?)` — plugin factory
- 型: `SeoPluginOptions`、`FeedOptions`、`SeoMetadata`、`WebsiteSeoInput`、
  `RenderableFeedEntry`
- helper: `buildArticleSeo`、`buildWebsiteSeo`、`buildAbsoluteUrl`、
  `buildPostUrl`、`getDescription`、`filterFeedEntries`、
  `getEntryPublishedTime`、`getEntryUpdatedTime`、`getHtmlLanguage`、
  `calculateReadingTime`、`renderSitemap`、`renderRobots`、`renderRssFeed`、
  `renderAtomFeed`、`renderJsonFeed`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
