---
title: Hook context
sidebar:
  hidden: true
---

# Hook context

hook に渡される plugin context には `config`、`contentIndex`、`diagnostics`、`cache`、`output`、`logger`、`tracer` が含まれ、optional の `contentSource` もあります。グローバルシングルTon よりフレームワークサービスを優先します。

## PluginContext の形

```ts
type PluginContext = {
  config?: ResolvedRiebeckiteConfig;
  contentIndex: Map<string, string>;
  diagnostics: Diagnostic[];
  cache: PluginCache;
  output: GeneratedOutputSink;
  logger: Logger;
  tracer: Tracer;
  contentSource?: ContentSource;
};
```

## hook ごとの追加

hook によっては `slug`、`markdown`、`content`、`manifest`、`entries` および location input などの追加フィールドが付きます。常にコンテキストからフレームワークサービスを優先してください。

## 関連用語

- [[plugin|Plugin]]
- [[content-hook|Content hook]]
- [[lifecycle-hook|Lifecycle hook]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
