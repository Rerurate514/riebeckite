---
date: 2026-10-14
title: コンテンツコレクション（Content Collection）
sidebar:
  hidden: true
---

# コンテンツコレクション（Content Collection）

クエリ用に作られるコンテンツエントリのまとまりで、タグ、フォルダー、日付、frontmatterのフィールドなどの種類で定義します。タクソノミーページ、アーカイブ、シリーズの一覧はコレクションから作られます。

## 種類

コレクションは1つの軸でエントリを選びます。

- `tags` — 同じタグを持つエントリ。
- `folder` — あるディレクトリ配下のエントリ。
- `date` — 年、月、日でまとめたエントリ。
- frontmatterのフィールド — 同じ値を持つエントリ。シリーズで使われる形です。

## エントリの選び方

```ts
{
  kind: "tags",
  filter: (entry) => entry.frontmatter.published !== false,
  sort: "date",
  order: "desc",
}
```

## コンテンツコレクションの定義

`ContentCollection`は`ContentCollectionDefinition`で定義し、`kind`と任意の`filter`、`sort`、`order`を指定します。`buildContentCollections`関数（`packages/core/src/content/content_collection.ts`）がマニフェストのエントリをタクソノミー・日付・フォルダーベースの一覧にまとめ、ページネーション、並べ替え、フィルターに対応します。

`ContentCollectionDefinition`の例：

```ts
{
  kind: "tags",
}
```

フィルターと並べ替えを付けた例：

```ts
{
  kind: "date",
  filter: (entry) => entry.frontmatter.published !== false,
  sort: "date",
  order: "desc",
}
```

利用できる種類：

- `tags` — 同じタグを持つエントリ
- `folder` — あるディレクトリ配下のエントリ
- `date` — 年、月、日でまとめたエントリ
- frontmatterのフィールド — 同じ値を持つエントリ。シリーズで使われる形です。
