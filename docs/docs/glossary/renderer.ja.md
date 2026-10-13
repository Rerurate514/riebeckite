---
title: Renderer
sidebar:
  hidden: true
---

# Renderer

ソースファイルを HTML に変える Plugin の capability です。コンテンツ処理の間に順に試され、最初に null 以外を返したものが採用されます。

## 役割

- コンテンツ entry の HTML を生成します。
- config、content index、diagnostic、observability を受け取ります。

## 関連用語

- [[plugin|Plugin]]
- [[content-hook|Content Hook]]
- [[content-entry|Content Entry]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
