---
title: Public Location
sidebar:
  hidden: true
---

# Public Location

ノートをどこに公開するかを表し、内部の slug と正準の permalink に、任意の redirect とメタデータを組み合わせます。manifest が entry ごとに公開する解決済みの結果です。

## 構造

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  redirects: ["/docs/hello/"],
  metadata: { /* optional */ },
}
```

## redirect とメタデータ

Plugin は正準の位置に別名 URL や redirect を添えられます。permalink は正準のままで、redirect が古い URL をそこへ導きます。
