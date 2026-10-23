---
date: 2026-10-14
title: Content Collection
sidebar:
  hidden: true
---

# Content Collection

query用に作られるコンテンツentryのまとまりです。tag、folder、date、frontmatterのfieldなどのkindで定義し、Taxonomyページやarchive、seriesの一覧はcollectionから作られます。

## kindの種類

collectionは1つの軸でentryを選びます。

- `tags`は同じtagを持つentryです。
- `folder`はあるディレクトリ配下のentryです。
- `date`は年・月・日でまとめたentryです。
- frontmatterのfield ：同じ値を持つentry。seriesでも使います。

## entryの選び方

```ts
{
  kind: "tags",
  filter: (entry) => entry.frontmatter.published !== false,
  sort: "date",
  order: "desc",
}
```

## content collectionの定義

`ContentCollection`は`ContentCollectionDefinition`で定義され、kindとオプションのfilter、sort、orderが指定されます。マニフェストのentryをタグ/日付/フォルダベースのリストにグループ化し、ページネーション、ソート、フィルタをサポートするのが`buildContentCollections`関数(`packages/core/src/content/content_collection.ts`)の役割です。

`ContentCollectionDefinition`の例:

```ts
{
  kind: "tags",
}
```

フィルタとソート付きの例:

```ts
{
  kind: "date",
  filter: (entry) => entry.frontmatter.published !== false,
  sort: "date",
  order: "desc",
}
```

利用可能なkind：

- `tags`：同じtagを持つentry
- `folder`：あるディレクトリ配下のentry
- `date`：年・月・日でまとめたentry
- frontmatterのfield ：同じ値を持つentry。seriesでも使います。
