---
title: Content Hook
sidebar:
  hidden: true
---

# Content Hook

onContentLoaded、onPostParsed、onPostProcessed、onManifestCreated など、コンテンツ処理の段階を観察または拡張する Plugin の hook です。post と manifest の hook は content cache がヒットしても実行されます。

## 役割

- Plugin がコンテンツ処理を観察・調整できるようにします。
- manifest の段階では毎 Build 実行されます。

## 関連用語

- [[plugin|Plugin]]
- [[lifecycle-hook|Lifecycle Hook]]
- [[renderer|Renderer]]
- [[glossary/build-dependency|Build Dependency]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Build Dependency Contract](../framework/build-dependency.ja.md)
