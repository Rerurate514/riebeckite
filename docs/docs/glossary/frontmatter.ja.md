---
title: Frontmatter
sidebar:
  hidden: true
---

# Frontmatter

コンテンツファイルの先頭にあるYAMLのブロックで、title、date、tags、visibilityなどの型付きメタデータに解析されます。slugとは独立にノートを識別する安定したidもここに置きます。

## よく使うfield

| field | 用途 |
| --- | --- |
| `title` | 表示タイトル |
| `date` | 公開日や並び替えの日付 |
| `tags` | Taxonomyの値 |
| `series` | Seriesへの所属 |
| `published` | 公開の判定 |
| `visibility` | 一覧に載せるかunlistedか |
| `aliases` | 追加のリンクキー |
| `id` | 安定したcontent id |

## 解析

frontmatterは本文より先に解析するため、hookと公開位置の解決はメタデータを先に読めます。未知のfieldはPlugin用にそのまま残ります。
