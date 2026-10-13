---
title: Taxonomy
sidebar:
  hidden: true
---

# Taxonomy

/tags/ のような一覧ページへ、tag、folder、dateでコンテンツをまとめる仕組みです。Taxonomyページはcontent collectionから作られ、リンクにはpermalinkを使います。

## 軸

- `tags` — frontmatterの`tags` fieldから。
- `folder` — ディレクトリ構造から。
- `date` — 年・月・日で。

## ページ

Taxonomyページはcontent collectionをページとして描画したものです。リンクには各entryのpermalinkを使うため、名前を変えてもURLは正しく保たれます。
