---
title: Content Collection
sidebar:
  hidden: true
---

# Content Collection

query 用に作られるコンテンツ entry のまとまりです。tag、folder、date、frontmatter の field などの kind で定義し、Taxonomy ページや archive、series の一覧は collection から作られます。

## kind の種類

collection は1つの軸で entry を選びます。

- `tags` — 同じ tag を持つ entry。
- `folder` — あるディレクトリ配下の entry。
- `date` — 年・月・日でまとめた entry。
- frontmatter の field — 同じ値を持つ entry。series でも使います。

## entry の選び方

```ts
{
  kind: "tags",
  filter: (entry) => entry.frontmatter.published !== false,
  sort: "date",
  order: "desc",
}
```
