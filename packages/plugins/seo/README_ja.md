# @riebeckite/plugin-seo

記事のメタデータ、サイトマップ、robots.txt、RSS・Atom・JSON Feed をまとめて生成するプラグインです。アプリケーションはプラグインが提供する SEO 拡張を受け取り、各ページの出力に利用します。

[English](./README.md)

## 設定する

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

| 項目 | 説明 |
| --- | --- |
| `siteName` | ページタイトルに使うサイト名。省略時は `site.title` |
| `defaultImage` | 既定の OGP 画像。省略時は `site.defaultOgImage` |
| `feed` | RSS、Atom、JSON Feed の出力を個別に有効化する |
| `sitemap` | サイトマップを出力する |
| `robots` | robots.txt を出力する |

## 記事の frontmatter が出力を決める

`buildArticleSeo()` は記事タイトル、説明、canonical URL、OGP 画像、公開・更新日時、タグ、読了時間を組み立て、`BlogPosting` と `BreadcrumbList` の JSON-LD を作ります。値は次の順で補完されます。

| フィールド | 用途 |
| --- | --- |
| `title` | 記事タイトル。なければ slug の末尾 |
| `description` | meta description。なければ本文の先頭 160 文字 |
| `canonical` | 正規 URL。なければ解決済みの canonical permalink |
| `image` / `ogImage` | OGP 画像。なければ設定上の既定画像 |
| `published` / `date` / `created` | 公開日時 |
| `updated` | 更新日時。なければ公開日時 |
| `tags` | キーワードとフィードのタグ |
| `noindex` | 検索エンジン向けの noindex と、サイトマップ・フィードからの除外 |

記事以外には `buildWebsiteSeo()` を使えます。トップやタグ一覧向けに `WebSite` と `BreadcrumbList` の構造化データを作ります。

## 公開物に含まれる記事

サイトマップとフィードは、公開済みで `noindex: true` ではないエントリーだけを対象にし、更新日時の新しい順に並べます。URL には各エントリーの解決済み canonical `permalink`（`ContentManifestEntry.permalink`）を使い、slug から再構築しません。出力関数は `renderSitemap`、`renderRobots`、`renderRssFeed`、`renderAtomFeed`、`renderJsonFeed` です。

読了時間は CJK 文字を毎分 500 文字、ラテン文字の単語を毎分 220 語として数え、最低 1 分に切り上げます。

## 主なエクスポート

- `seo(options?)`: プラグインを作成する
- `buildArticleSeo`、`buildWebsiteSeo`: ページの SEO 情報を構築する
- `renderSitemap`、`renderRobots`、`renderRssFeed`、`renderAtomFeed`、`renderJsonFeed`: 公開用ファイルを描画する
- `calculateReadingTime`: 読了時間を計算する
- 型: `SeoPluginOptions`、`FeedOptions`、`SeoMetadata`、`WebsiteSeoInput`、`RenderableFeedEntry`

## 関連資料

- [プラグインシステム](../../../docs/ja/docs/reference/plugin-api.md)

