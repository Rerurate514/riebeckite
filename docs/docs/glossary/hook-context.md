---
date: 2026-10-14
title: Hook context
sidebar:
  hidden: true
---

# Hook context
The plugin context passed to hooks includes `config`, `isDevelopment`, `contentIndex`, `diagnostics`, `cache`, `output`, `logger`, `tracer`, and optionally `contentSource`; prefer framework services over global singletons.

## PluginContext shape
```ts
type PluginContext = {
  config?: ResolvedRiebeckiteConfig;
  isDevelopment?: boolean;
  contentIndex: Map<string, string>;
  diagnostics: Diagnostic[];
  cache: PluginCache;
  output: GeneratedOutputSink;
  logger: Logger;
  tracer: Tracer;
  contentSource?: ContentSource;
};
```

## Per-hook additions
Depending on the hook, additional fields such as `slug`, `markdown`, `content`, `manifest`, `entries`, and location input are added. The following table shows per-hook additions:

| Hook | Additional Fields |
|---|---|
| `onConfigResolved` | `config` |
| `onContentLoaded` | `slug`, `content` |
| `onPostParsed` | `markdown`, `slug` |
| `onPostProcessed` | `markdown`, `slug`, `content` |
| `onManifestCreated` | `manifest`, `entries` |

Always prefer receiving framework services from the context over creating global singletons.

## Related terms
- [[plugin|Plugin]]
- [[content-hook|Content hook]]
- [[lifecycle-hook|Lifecycle hook]]
- [[glossary/diagnostics|Diagnostics]]

## Learn more
- [Plugin API](../reference/plugin-api.md)
