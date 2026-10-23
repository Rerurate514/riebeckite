---
date: 2026-10-14
title: Public Path
sidebar:
  hidden: true
---

# Public Path

サイトのoriginを付ける前の、公開URLのパス部分です。permalinkを解決した後にリンクが使う値です。

## 概要

permalinkが`https://example.com/docs/hello/`のとき、public pathは`/docs/hello/`です。permalinkは完全な値で、public pathはそのパス部分です。

## public pathの型と解決

public pathはノートの公開URLのパス部分で、サイトのoriginを付ける前の値です。location resolutionの際に解決される`ContentPublicLocation`(`packages/core/src/types/content_manifest.ts`)から導かれます。

主なプロパティ：

- **由来**: 解決されたpermalinkからサイトのoriginを削って算出（例：`https://example.com/docs/hello/`の場合、public pathは`/docs/hello/`）
- **用途**: ルーティング規則、sitemap生成、内部リンク生成に使用されます。Integrationはpermalinkが解決された後にpublic pathを使ってリンクを描画します
- **伝播**: URL規則の変更（permalink plugin、config変更）はcontentファイルを編集せずにすべてのpublic pathに反映されます

public pathの値の例：

```ts
// permalink "https://example.com/docs/hello/" の場合、public pathは "/docs/hello/"
// permalink "https://example.com/blog/post-1/" の場合、public pathは "/blog/post-1/"
```

sitemap生成での使用例:

```ts
// <url><loc>https://example.com/docs/hello/</loc></url> を生成
// /docs/hello/ の部分がpublic pathです
```

## 現れる場所

ルーティング、sitemap、生成するリンクはすべてpublic pathを使用します。値は解決済みの公開位置から来るため、URLの規則を変えてもコンテンツを編集せずに反映されます。
