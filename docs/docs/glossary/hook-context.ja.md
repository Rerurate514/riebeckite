---
date: 2026-10-14
title: フックコンテキスト（Hook Context）
sidebar:
  hidden: true
---

# フックコンテキスト（Hook Context）
フックに渡されるプラグインのコンテキストには`config`、`contentIndex`、`diagnostics`、`cache`、`output`、`logger`、`tracer`が含まれ、任意で`contentSource`も渡されます。グローバルなシングルトンより、フレームワークのサービスを優先してください。

## PluginContextの形
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

## フックごとの追加
フックによっては`slug`、`markdown`、`content`、`manifest`、`entries`、公開先の入力などのフィールドが追加されます。フックごとの追加は次の表のとおりです。

| フック | 追加フィールド |
|---|---|
| `onConfigResolved` | `config` |
| `onContentLoaded` | `slug`、`content` |
| `onPostParsed` | `markdown`、`slug` |
| `onPostProcessed` | `markdown`、`slug`、`content` |
| `onManifestCreated` | `manifest`、`entries` |

グローバルなシングルトンを作るより、常にコンテキストからフレームワークのサービスを受け取ってください。

## 関連用語
- [[plugin|Plugin]]
- [[content-hook|Content hook]]
- [[lifecycle-hook|Lifecycle hook]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく
- [Plugin API](../reference/plugin-api.ja.md)
