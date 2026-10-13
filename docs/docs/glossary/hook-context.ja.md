---
title: Hook context
sidebar:
  hidden: true
---

# Hook context

hookに渡されるplugin contextには`config`、`contentIndex`、`diagnostics`、`cache`、`output`、`logger`、`tracer`が含まれ、任意で`contentSource`も渡されます。グローバルなSingletonではなく、フレームワークのサービスを使います。

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

## hookごとの追加

hookによっては`slug`、`markdown`、`content`、`manifest`、`entries`、locationの入力などのfieldが追加されます。必要なサービスは常にcontextから受け取ります。

## 関連用語

- [[plugin|Plugin]]
- [[content-hook|Content hook]]
- [[lifecycle-hook|Lifecycle hook]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
