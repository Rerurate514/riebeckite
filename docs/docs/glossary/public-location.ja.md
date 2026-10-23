---
date: 2026-10-14
title: 公開先（Public Location）
sidebar:
  hidden: true
---

# 公開先（Public Location）

ノートをどこに公開するかを表すもので、内部slugと正規のpermalinkに、任意のリダイレクトとメタデータを組み合わせます。マニフェストがエントリごとに公開する解決済みの結果です。

## 公開先の構造

公開先は、内部slugと正規のpermalinkに、任意のリダイレクトとメタデータを組み合わせたものです。マニフェストがエントリごとに公開する解決済みの結果で、`ContentPublicLocation`（`packages/core/src/types/content_manifest.ts`）として型付けされています。

標準的な構造：

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  redirects: ["/docs/hello/"],
  metadata: { /* optional */ },
}
```

`slug` フィールドはコンテンツの内部slugと一致します。`permalink` フィールドは正規の公開URLです。任意の `redirects` 配列には、古いURLを正規のpermalinkへ導く `ContentRedirect` エントリ（`packages/core/src/types/content_manifest.ts`）が入ります。任意の `metadata` フィールドでは、プラグインやインテグレーションが追加のキーと値の情報を添付できます。

## リダイレクトとメタデータ

プラグインは、正規の公開先の隣に別名URLや[リダイレクト](./redirect.md)を添えられます。permalinkは正規のままで、リダイレクトが古いURLをそこへ導きます。これはマニフェストの `publicRedirects` と `redirects` のマップで管理され、`packages/core/src/content/content_manager.ts` の `buildManifest` で埋められます。

リダイレクトとメタデータを持つマニフェストエントリの例：

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  redirects: ["/docs/hello/", "/hello/"],
  metadata: { author: "tanaka", lastModified: "2024-01-01" },
}
```
