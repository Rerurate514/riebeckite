---
title: Endpoint
sidebar:
  hidden: true
---

# Endpoint

Endpointは、Pluginが使える再利用可能なHTTPの振る舞いを宣言します。Integrationは、Pluginごとにフレームワーク固有のroutingを組み込むことなく、Endpointの契約をホストのrouterに接続します。

## Endpointの定義

```ts
import { defineEndpoint } from "@riebeckite/core";

const searchEndpoint = defineEndpoint(
  "/search-data.json",
  ({ config, manifest }) => ({ json: buildSearchItems({ config, manifest }) }),
  { cacheControl: "public, max-age=300" },
);
```

## Integrationへの接続

IntegrationはEndpointの契約をホストのrouterに接続します。Plugin自身で特定のrouter実装（HonoXなど）を組み込まないでください。

## 関連用語

- [[plugin|Plugin]]
- [[island|Island]]
- [[client-entry|Client entry]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
