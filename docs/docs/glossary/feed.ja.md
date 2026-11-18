---
date: 2026-10-14
title: フィード（Feed）
sidebar.hidden: true
---

# フィード（Feed）

公開されたコンテンツを機械可読に並べたもので、RSS、Atom、JSON Feed などがあります。フィードは検出可能なエントリから作り、各エントリのパーマリンクを使います。

## フィードが使うもの

- 検出可能なエントリ。unlisted のページは含まれません。
- 各エントリのパーマリンク。slug から組み直した URL は使いません。
- frontmatter のタイトル、日付、説明。

## フィードの生成

フィードは SEO プラグイン（`packages/plugins/seo/src/feeds.ts`、`endpoints.ts` で登録）が生成します。`seo/src/content.ts` の `filterFeedEntries` が `noindex: true` のエントリを除外し、公開日で並べ替えます。

```ts
import { renderRssFeed, renderAtomFeed, renderJsonFeed } from "@riebeckite/plugin-seo";
```

`feeds.ts` の `getResolvedFeedMetadata` 関数は `config.site.feed` から `title`、`description`、`language` を抽出し、`feed.limit` オプションがエントリ数の上限を決めます。形式は次の3つです。

| 形式 | 主な用途 |
| --- | --- |
| RSS | 最も広いリーダー対応 |
| Atom | より厳密で仕様が明確 |
| JSON Feed | プログラムからの利用 |

## 多言語サイト

フィードは言語別に分かれません。多言語コンテンツのサイトでは、形式ごとに1つのフィードを公開し、`<language>` は `config.site.feed.language`（または `site.locale`）から取ります。エントリの一覧には全言語の検出可能なエントリが混ざります（例: 英語と日本語の投稿が交互に並ぶ）。言語で絞り込みたいリーダーは各アイテムのパーマリンクからロケールを判断してください。`feed.limit` は多めに設定して、どの言語の最新投稿も上限に入るようにします。
