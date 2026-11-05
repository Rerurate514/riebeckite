---
date: 2026-10-14
title: 公開パス（Public Path）
sidebar:
  hidden: true
---

# 公開パス（Public Path）

サイトのオリジンを付ける前の、ノートの公開 URL のパス部分です。permalink を解決した後にリンクが使う値です。

## 公開パス

permalink が `/docs/hello` のとき、公開パスは `/docs/hello` です。[permalink](./permalink.md) はサイト内パスとして保存され、サイトのオリジンはフィード、サイトマップ、canonical メタデータを出力するときにだけ付きます。

## 現れる場所

ルーティング、サイトマップ、生成されるリンクはすべて公開パスを扱います。値は解決済みの公開先から来るため、URL の規則を変えるとコンテンツを編集せずに反映されます。

## 公開パスの型と解決

公開パスは、サイトのオリジンを付ける前の、ノートの公開 URL のパス部分です。公開先の解決時に解決される `ContentPublicLocation`（`packages/core/src/types/content_manifest.ts`）から導かれます。

主な性質：

- **由来**：解決済みの permalink はすでにサイト内パスです（例：`/docs/hello`）。オリジンはフィード、サイトマップ、canonical メタデータの絶対 URL にだけ付きます
- **用途**：ルーティング規則、サイトマップ生成、内部リンク生成で使います。インテグレーションは permalink の解決後に公開パスを使ってリンクを描画します
- **伝播**：URL 規則の変更（permalink プラグイン、設定変更）は、コンテンツファイルの編集なしにすべての公開パスへ反映されます

公開パスの値の例：

```ts
// For permalink "https://example.com/docs/hello/": public path is "/docs/hello/"
// For permalink "https://example.com/blog/post-1/": public path is "/blog/post-1/"
```

サイトマップ生成での例：

```ts
// Generates <url><loc>https://example.com/docs/hello/</loc></url>
// The /docs/hello/ part is the public path
```
