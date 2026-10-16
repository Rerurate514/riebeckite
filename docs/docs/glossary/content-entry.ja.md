---
title: Content Entry
sidebar:
  hidden: true
---

# Content Entry

manifestの中でslugにより識別される、解決済みのコンテンツ1件です。permalink、公開位置、frontmatter、公開状態、HTML、Pluginが提供するデータヘルパーとJSXコンポーネントを持ちます。

## entryが持つもの

`ContentManifestEntry`は以下のフィールドを持ちます。すべてコンテンツ処理時に埋められます。

| フィールド | タイプ | 説明 |
| --- | --- | --- |
| `slug` | `string` | entryを識別する内部キーです。 |
| `contentId` | `string | undefined` | slug、permalink、aliases、redirectsとは独立した、ソース作者によって決まる安定したcontent IDです。 |
| `permalink` | `string` | 公開URL（例：`/blog/my-post/`）。 |
| `publicLocation` | `ContentPublicLocation` | このentryのslug、permalink、言語、redirects、メタデータです。 |
| `title` | `string` | ページのタイトルです。 |
| `aliases` | `readonly string[]` | 明示的なリダイレクトエイリアスです。 |
| `frontmatter` | `PostFrontmatter` | 解析済みのfrontmatterメタデータです。 |
| `publishing` | `ResolvedPublishingState` | 公開状態（`published`、`unlisted`、`draft`、`scheduled`など）。 |
| `html` | `string` | 渲染済みのHTMLボディです。 |
| `tags` | `string[]` | このentryに関連付けられたタグです。 |
| `links` | `ContentLink[]` | コンテンツ内のmarkdown/wikilink参照の解決済みリストです。 |
| `backlinks` | `string[]` | content graphによって計算されたbacklinkリストです。 |
| `assets` | `ContentAsset[]` | プラグインによって宣言されたassetsです。 |

コンシューマーは通常、`permalink`をリンクに、`frontmatter`をメタデータに、プラグイン提供のデータをレイアウト構成に使用します。

## slugとpermalinkの違い

slugはBuildのinternalでentryを識別し、permalinkは公開URLです。entryへリンクする側はslugではなく、entryのpermalinkを読みます。

## ページがentryデータを読み込む方法

ページやテンプレートはmanifestのlookup mapsを通じてentryデータにアクセスします。よくあるパターンは以下の通りです：

- **permalinkの解決**: `entry.permalink`を直接読む、あるいは`byPermalink`マップを使ってslugからURLへのlookupを行う。
- **frontmatterの参照**: `entry.frontmatter`でページメタデータ（タイトル、日時、タグなど）にアクセスする。
- **headタグのレンダリング**: プラグインが提供する`entry.headTags`はサイトシェルが`<head>`内でレンダリングする。
- **assetsの参照**: `entry.assets`にはプラグインによって宣言された`ContentAsset`entriesが含まれる。サイトは出力時にコピーまたは参照する。

サイトテンプレートでのentryアクセス例：

```ts
const entry = manifest.bySlug.get("my-post");
if (entry) {
  const url = entry.permalink;
  const title = entry.title;
  const meta = entry.frontmatter;
  }
```