---
date: 2026-10-14
title: コンテンツコレクション（Content Collection）
sidebar:
  hidden: true
---

# コンテンツコレクション（Content Collection）

クエリ用に作られるコンテンツエントリのまとまりで、タグ、フォルダー、日付、frontmatter のフィールドなどの種類で定義します。タクソノミーページ、アーカイブ、シリーズの一覧はコレクションから作られます。

## 種類

コレクションは1つの軸でエントリを選びます。

- `tags` — 同じタグを持つエントリ。
- `folder` — あるディレクトリ配下のエントリ。
- `date` — 年、月、日でまとめたエントリ。
- frontmatter のフィールド — 同じ値を持つエントリ。シリーズで使われる形です。

## エントリの選び方

```ts
{
  kind: "notes",
  groupBy: { by: "tags" },
  basePath: "/tags",
  filter: { tags: { any: ["notes"] } },
  sort: { field: "date", order: "desc" },
}
```

## コンテンツコレクションの定義

`ContentCollection` は `ContentCollectionDefinition` で定義します。`kind` は安定した識別子、`groupBy` はグループ化の軸、`basePath` は生成される一覧のサイト内パス接頭辞です。`filter`、`sort`、`order`、`locale` は任意です。`filter` は述語関数ではなく `ContentQueryFilter` オブジェクトです。`buildContentCollections` 関数（`packages/core/src/content/content_collection.ts`）がマニフェストのエントリを一覧にまとめ、ページネーション、並べ替え、フィルターに対応します。

`ContentCollectionDefinition` の例：

```ts
{
  kind: "tags",
  groupBy: { by: "tags" },
  basePath: "/tags",
}
```

フィルターと並べ替えを付けた例：

```ts
{
  kind: "archive",
  groupBy: { by: "date", granularity: "month" },
  basePath: "/archive",
  filter: { date: { from: "2026-01-01" } },
  sort: { field: "date", order: "desc" },
}
```

グループ化の軸（`groupBy.by`）：

- `tags` — 同じタグを持つエントリ
- `folder` — あるディレクトリ配下のエントリ
- `date` — 年、月、日でまとめたエントリ
- `frontmatter` — 同じ frontmatter フィールドの値を持つエントリ。シリーズで使われる形です。
