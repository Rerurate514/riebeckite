---
title: Feed
sidebar:
  hidden: true
---

# Feed

公開されたコンテンツを機械可読に並べたもので、RSS、Atom、JSON Feedなどがあります。Feedはdiscoverableなentryから作り、各entryのpermalinkを使います。

## feedが使うもの

- discoverableなentry。unlistedのページは含めません。
- 各entryのpermalink。slugから組み直したURLは使いません。
- frontmatterのtitle、date、description。

## feedの生成
feedはSEOプラグイン(`packages/plugins/seo/src/feeds.ts`)がresolved configとfiltered entriesを使用して生成します。3つの形式があります：

| 形式 | 主な用途 |
| --- | --- |
| RSS | 最も広く対応 |
| Atom | 厳密で仕様が明確 |
| JSON Feed | プログラムからの利用 |

feed entryはdiscoverable entryから作られ（unlistedページは含まれず）、各entryのpermalinkが使用され（slugからURLを組み直すのではなく）、feedメタデータ（title、description、language）は`config.site.feed`から取得されます。entryの数は`feed.limit`オプションで制限されます。

```ts
import { renderRssFeed, renderAtomFeed, renderJsonFeed } from "@riebeckite/plugin-seo";
```

`getResolvedFeedMetadata`関数は`config.site.feed`から`title`、`description`、`language`を抽出します。feed生成は`filterFeedEntries`を使用して`noindex: true`を持つentryを除外し、公開日時でソートします。

## 形式

| 形式 | 主な用途 |
| --- | --- |
| RSS | 最も広く対応 |
| Atom | 厳密で仕様が明確 |
| JSON Feed | プログラムからの利用 |
