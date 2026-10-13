---
title: Taxonomy
sidebar:
  hidden: true
---

# Taxonomy

/tags/ のような一覧ページへ、tag、folder、date でコンテンツをまとめる仕組みです。Taxonomy ページは content collection から作られ、リンクには permalink を使います。

## 軸

- `tags` — frontmatter の `tags` field から。
- `folder` — ディレクトリ構造から。
- `date` — 年・月・日で。

## ページ

Taxonomy ページは content collection をページとして描画したものです。リンクには各 entry の permalink を使うため、名前を変えても URL は正しく保たれます。
