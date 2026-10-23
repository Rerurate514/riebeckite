---
date: 2026-10-14
title: フィード（Feed）
sidebar:
  hidden: true
---

# フィード（Feed）

公開されたコンテンツを機械可読に並べたもので、RSS、Atom、JSON Feedなどがあります。フィードは検出可能なエントリから作り、各エントリのパーマリンクを使います。

## フィードが使うもの

- 検出可能なエントリ。unlistedのページは含まれません。
- 各エントリのパーマリンク。slugから組み直したURLは使いません。
- frontmatterのタイトル、日付、説明。

## フィードの生成
フィードはSEOプラグイン（`packages/plugins/seo/src/feeds.ts`）が、解決済みの設定と絞り込んだエントリを使って生成します。形式は次の3つです。

| 形式 | 主な用途 |
| --- | --- |
| RSS | 最も広いリーダー対応 |
| Atom | より厳密で仕様が明確 |
| JSON Feed | プログラムからの利用 |

フィードのエントリは検出可能なエントリから作られ（unlistedのページは除外されます）、各エントリのパーマリンクを使います（slugからURLを組み直すのではありません）。フィードのメタデータ（タイトル、説明、言語）は`config.site.feed`から取得します。エントリ数は`feed.limit`オプションで制限します。

```ts
import { renderRssFeed, renderAtomFeed, renderJsonFeed } from "@riebeckite/plugin-seo";
```

`getResolvedFeedMetadata`関数は`config.site.feed`から`title`、`description`、`language`を抽出します。フィードの生成は`filterFeedEntries`で`noindex: true`のエントリを除外し、公開日で並べ替えます。
