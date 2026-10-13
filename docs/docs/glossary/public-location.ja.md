---
title: Public Location
sidebar:
  hidden: true
---

# Public Location

ノートをどこに公開するかを表し、内部のslugと正準のpermalinkに、任意のredirectとメタデータを組み合わせます。manifestがentryごとに公開する解決済みの結果です。

## 構造

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  redirects: ["/docs/hello/"],
  metadata: { /* optional */ },
}
```

## redirectとメタデータ

Pluginは正準の位置に別名URLやredirectを添えられます。permalinkは正準のままで、redirectが古いURLをそこへ導きます。
