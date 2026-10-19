---
title: Public Location
sidebar:
  hidden: true
---

# Public Location

ノートをどこに公開するかを表し、内部のslugと正準のpermalinkに、任意のredirectとメタデータを組み合わせます。manifestがentryごとに公開する解決済みの結果です。

## public locationの構造

public locationはinternalなslugとcanonicalなpermalink、任意のredirectsとメタデータを組み合わせたものです。manifestがentryごとに公開する解決済みの結果です。`ContentPublicLocation`(`packages/core/src/types/content_manifest.ts`)で型付けされています。

標準的な構造:

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  redirects: ["/docs/hello/"],
  metadata: { /* optional */ },
}
```

`slug`フィールドはコンテンツのinternalなslugに一致します。`permalink`フィールドは正規の公開URLです。オプションの`redirects`配列は`ContentRedirect`エントリ(`packages/core/src/types/content_manifest.ts`)を含み、古いURLを正規のpermalinkに導きます。オプションの`metadata`フィールドはpluginやintegrationが追加のkey-value情報を添付することを許可します。

## redirectとメタデータ

pluginは正規の位置に別名URLやredirectを添えられます。permalinkは正規のままで、redirectが古いURLをそこへ導きます。これは`buildManifest`(`packages/core/src/content/content_manager.ts`)で`publicRedirects`と`redirects`マップが埋められている際に管理されます。

redirectsとメタデータを持つmanifest entryの例:

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  redirects: ["/docs/hello/", "/hello/"],
  metadata: { author: "tanaka", lastModified: "2024-01-01" },
}
```
