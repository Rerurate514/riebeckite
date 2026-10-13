---
title: Public Path
sidebar:
  hidden: true
---

# Public Path

サイトのoriginを付ける前の、公開URLのパス部分です。permalinkを解決した後にリンクが使う値です。

## public path

permalinkが`https://example.com/docs/hello/`のとき、public pathは`/docs/hello/`です。permalinkは完全な値で、public pathはそのパス部分です。

## 現れる場所

ルーティング、sitemap、生成するリンクはpublic pathを使います。値は解決済みの公開位置から来るため、URLの規則を変えてもコンテンツを編集せずに反映されます。
