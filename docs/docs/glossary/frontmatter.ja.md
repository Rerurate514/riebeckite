---
title: Frontmatter
sidebar:
  hidden: true
---

# Frontmatter

コンテンツファイルの先頭にある YAML のブロックで、title、date、tags、visibility などの型付きメタデータに解析されます。slug とは独立にノートを識別する安定した id もここに置きます。

## よく使う field

| field | 用途 |
| --- | --- |
| `title` | 表示タイトル |
| `date` | 公開日や並び替えの日付 |
| `tags` | Taxonomy の値 |
| `series` | Series への所属 |
| `published` | 公開の判定 |
| `visibility` | 一覧に載せるか unlisted か |
| `aliases` | 追加のリンクキー |
| `id` | 安定した content id |

## 解析

frontmatter は本文より先に解析するため、hook と公開位置の解決はメタデータを先に読めます。未知の field は Plugin 用にそのまま残ります。
