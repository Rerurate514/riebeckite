---
date: 2026-10-14
title: Content Query
sidebar:
  hidden: true
---

# Content Query

タグ、フォルダ、日付、またはfrontmatterフィールドでコンテンツentryを選択・フィルタリングし、リスト表示やプラグインデータに使用されます。taxonomy、series、関連投稿で使用されます。

## クエリ方法

コンテンツクエリは`content-query`プラグインを通じて解決され、以下のフィルタリングがサポートされます。

| フィルタ種類 | 説明 |
| --- | --- |
| `tag` | tagによるマッチング |
| `folder` | フォルダパスによるマッチング |
| `date` | 公開日によるマッチング |
| `frontmatter field` | 任意のfrontmatterキーによるマッチング |

```ts
import { searchItems } from "@riebeckite/plugins/search";

const results = searchItems(entries, "tag:news");
```

## 関連用語

- [[content-collection|Content Collection]]
- [[glossary/taxonomy|Taxonomy]]
- [[glossary/series|Series]]
- [[manifest|Manifest]]

## content-queryプラグインのランタイム

content-queryプラグインはentry HTML内のqueryブロックを解決するランタイム（`packages/plugins/query/src/runtime.ts`）を使用します。このランタイムは以下の処理を行います：

1. entry HTML内にマークされた`query`属性を持つqueryブロックを検索
2. YAMLでエンコードされたquery specをパース
3. `discoverableEntries`（または指定されたpool）を使用して`queryContentEntries`でフィルタリング
4. ブロックをレンダリング結果で置換

`queryContentEntries`関数（`packages/core/src/content/content_query.ts`）はタグ、フォルダ、日付、frontmatterフィールドによるフィルタリングをサポートし、ソート、ページネーション、グループ化を処理します。

## グループ化とページネーション

コンテンツクエリはタグ、フォルダ、日付、frontmatterフィールドによってグループ化をサポートし、`offset`と`limit`specフィールドによるページネーションもサポートします。`groupContentEntries`関数（`packages/core/src/content/content_query.ts`）はグループキーとmember entriesを持つ`ContentQueryGroup[]`エントリを返します。

```ts
// From packages/core/src/content/content_query.ts
export function groupContentEntries(
  entries: readonly ContentManifestEntry[],
  groupBy: ContentQueryGroupBy,
  options: ContentQueryGroupOptions = {},
): ContentQueryGroup[];
```

## さらに詳しく

- [../plugins/query.ja.md]