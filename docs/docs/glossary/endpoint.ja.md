---
title: Endpoint
sidebar:
  hidden: true
---

# Endpoint

Endpoint はプラグインのための再利用可能な HTTP 動作を宣言します; integration は plugin ごとのフレームワーク固有の routing を組み込むことなく、endpoint contract を host router に接続します。

## エンドポイントの定義

```ts
import { defineEndpoint } from "@riebeckite/core";

const searchEndpoint = defineEndpoint(
  "/search-data.json",
  ({ config, manifest }) => ({ json: buildSearchItems({ config, manifest }) }),
  { cacheControl: "public, max-age=300" },
);
```

## integration 接続

integration は endpoint contract を host router に接続します。plugin 自身で特定の router 実装 (HonoX など) を組み込まないでください。

## 関連用語

- [[plugin|Plugin]]
- [[island|Island]]
- [[client-entry|Client entry]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
