---
date: 2026-10-14
title: エンドポイント（Endpoint）
sidebar:
  hidden: true
---

# エンドポイント（Endpoint）

エンドポイントは、プラグインが使える再利用可能なHTTPの振る舞いを宣言します。インテグレーションがエンドポイントの取り決めをホストのルーターに接続するため、プラグイン自体にフレームワーク固有のルーティングを埋め込む必要はありません。

## エンドポイントの定義

```ts
import { defineEndpoint } from "@riebeckite/core";

const searchEndpoint = defineEndpoint(
  "/search-data.json",
  ({ config, manifest }) => ({ json: buildSearchItems({ config, manifest }) }),
  { cacheControl: "public, max-age=300" },
);
```

## インテグレーションとの接続

インテグレーションがエンドポイントの取り決めをホストのルーターに接続します。プラグイン自体に特定のルーター実装（HonoXなど）を埋め込まないでください。

## 関連用語

- [[plugin|Plugin]]
- [[island|Island]]
- [[client-entry|Client entry]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
