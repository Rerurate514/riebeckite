---
title: Fingerprint
sidebar:
  hidden: true
---

# Fingerprint

コンテンツやファイルの入力を識別し、変化を検出できるようにするハッシュです。保存した値と異なれば、依存するコンテンツを再処理します。

## 何を識別するか

contentのfingerprintは、source、frontmatter、pipeline、Pluginの`cacheVersion`から作られます。content fingerprintは、Markdownソース、解析したfrontmatter、cache schemaのバージョン（`CONTENT_CACHE_SCHEMA_VERSION`、現在は5）、pipeline fingerprintから計算します。pipeline fingerprintには、Pluginの構成、content filter、Pluginの`cacheVersion`の値を組み込みます。

fileのfingerprintはsourceのファイルが変わったときに変わります。file fingerprintはsourceファイルが変わったときに変化します。

pipelineのfingerprintにはPluginの設定とcontent filterの設定が含まれます。pipeline fingerprint（`packages/core/src/content/content_persistent_cache.ts`の`computePipelineFingerprint`）はplugin fingerprint、content filter、compatibility version（`CONTENT_CACHE_COMPATIBILITY_VERSION`、現在は3）を組み込みます。pipeline fingerprintが変場合、contentは再処理が必要です。

## 関連用語

永続的なcontent cacheとBuild Stateがfingerprintを比べ、再処理する範囲を決めます。

## 関連用語

- [[glossary/build-dependency|Build Dependency]]
- [[cache-invalidation|Cache Invalidation]]
- [[glossary/cache|Cache]]
- [[persistent-cache|Persistent Cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
