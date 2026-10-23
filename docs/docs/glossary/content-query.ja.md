---
date: 2026-10-14
title: コンテンツクエリ（Content Query）
sidebar:
  hidden: true
---

# コンテンツクエリ（Content Query）

一覧表示やプラグインのデータのために、タグ、フォルダー、日付、frontmatterのフィールドでコンテンツエントリを選んだり絞り込んだりする仕組みです。タクソノミー、シリーズ、関連記事で使われます。

## クエリの方法

コンテンツクエリは`content-query`プラグインを通じて解決され、次の条件で絞り込めます。

| フィルターの種類 | 説明 |
| --- | --- |
| `tag` | タグでエントリを照合する |
| `folder` | フォルダーのパスでエントリを照合する |
| `date` | 公開日でエントリを照合する |
| `frontmatter field` | 任意のfrontmatterのキーで照合する |

```ts
import { searchItems } from "@riebeckite/plugins/search";

const results = searchItems(entries, "tag:news");
```

## content-queryプラグインの実行環境

`content-query`プラグインは、エントリのHTML内のクエリブロックを解決する実行環境（`packages/plugins/query/src/runtime.ts`）を使います。この実行環境は次の処理を行います。

1. エントリのHTML内で`query`属性が付いたクエリブロックを見つける
2. YAMLでエンコードされたクエリの指定を解析する
3. `queryContentEntries`でマニフェストの`discoverableEntries`（または指定されたプール）を絞り込む
4. ブロックを描画結果で置き換える

`queryContentEntries`関数（`packages/core/src/content/content_query.ts`）は、タグ、フォルダー、日付、frontmatterのフィールドによる絞り込みに対応し、並べ替え、ページネーション、グループ化を扱います。

## グループ化とページネーション

コンテンツクエリは、タグ、フォルダー、日付、frontmatterのフィールドによるグループ化に対応し、`offset`と`limit`の指定によるページネーションにも対応します。`groupContentEntries`関数（`packages/core/src/content/content_query.ts`）は、グループのキーと所属するエントリを持つ`ContentQueryGroup[]`を返します。

```ts
// From packages/core/src/content/content_query.ts
export function groupContentEntries(
  entries: readonly ContentManifestEntry[],
  groupBy: ContentQueryGroupBy,
  options: ContentQueryGroupOptions = {},
): ContentQueryGroup[];
```

## 関連用語

- [[content-collection|Content Collection]]
- [[glossary/taxonomy|Taxonomy]]
- [[glossary/series|Series]]
- [[manifest|Manifest]]

## さらに詳しく

- [../plugins/query.ja.md]
