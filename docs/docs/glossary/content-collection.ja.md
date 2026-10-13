---
title: Content Collection
sidebar:
  hidden: true
---

# Content Collection

query用に作られるコンテンツentryのまとまりです。tag、folder、date、frontmatterのfieldなどのkindで定義し、Taxonomyページやarchive、seriesの一覧はcollectionから作られます。

## kindの種類

collectionは1つの軸でentryを選びます。

- `tags` — 同じtagを持つentry。
- `folder` — あるディレクトリ配下のentry。
- `date` — 年・月・日でまとめたentry。
- frontmatterのfield — 同じ値を持つentry。seriesでも使います。

## entryの選び方

```ts
{
  kind: "tags",
  filter: (entry) => entry.frontmatter.published !== false,
  sort: "date",
  order: "desc",
}
```
