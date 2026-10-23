---
date: 2026-10-14
title: 公開パス（Public Path）
sidebar:
  hidden: true
---

# 公開パス（Public Path）

サイトのオリジンを付ける前の、ノートの公開URLのパス部分です。permalinkを解決した後にリンクが使う値です。

## 公開パス

permalinkが `https://example.com/docs/hello/` のとき、公開パスは `/docs/hello/` です。[permalink](./permalink.md) は完全な値で、公開パスはそのパス部分です。

## 現れる場所

ルーティング、サイトマップ、生成されるリンクはすべて公開パスを扱います。値は解決済みの公開先から来るため、URLの規則を変えるとコンテンツを編集せずに反映されます。

## 公開パスの型と解決

公開パスは、サイトのオリジンを付ける前の、ノートの公開URLのパス部分です。公開先の解決時に解決される `ContentPublicLocation`（`packages/core/src/types/content_manifest.ts`）から導かれます。

主な性質：

- **由来**：解決済みのpermalinkからサイトのオリジンを除いて計算します（例：`https://example.com/docs/hello/` なら公開パスは `/docs/hello/`）
- **用途**：ルーティング規則、サイトマップ生成、内部リンク生成で使います。インテグレーションはpermalinkの解決後に公開パスを使ってリンクを描画します
- **伝播**：URL規則の変更（permalinkプラグイン、設定変更）は、コンテンツファイルの編集なしにすべての公開パスへ反映されます

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
