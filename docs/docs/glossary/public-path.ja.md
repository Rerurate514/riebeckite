---
title: Public Path
sidebar:
  hidden: true
---

# Public Path

サイトの origin を付ける前の、公開 URL のパス部分です。permalink を解決した後にリンクが使う値です。

## public path

permalink が `https://example.com/docs/hello/` のとき、public path は `/docs/hello/` です。permalink は完全な値で、public path はそのパス部分です。

## 現れる場所

ルーティング、sitemap、生成するリンクは public path を使います。値は解決済みの公開位置から来るため、URL の規則を変えてもコンテンツを編集せずに反映されます。
