---
date: 2026-10-14
title: フィンガープリント（Fingerprint）
sidebar:
  hidden: true
---

# フィンガープリント（Fingerprint）

コンテンツやファイルの入力を識別するハッシュで、ビルドが変更を検出し、キャッシュやビルド状態の比較に使います。

## 役割

入力が変わったかどうかを検出します。
キャッシュとビルド状態の比較を駆動します。フィンガープリントが保存済みの値と異なれば、依存するコンテンツが再処理されます。

## 種類

コンテンツのフィンガープリント：ソース、frontmatter、パイプラインのフィンガープリント、キャッシュスキーマ、プラグインのcacheVersionを含みます。コンテンツのフィンガープリントは、Markdownのソース、解析済みのfrontmatter、キャッシュスキーマのバージョン（`CONTENT_CACHE_SCHEMA_VERSION`、現在は5）、およびプラグインの設定・コンテンツフィルター・プラグインの`cacheVersion`の値を取り込んだパイプラインのフィンガープリントから計算します。

パイプラインのフィンガープリント：プラグインのフィンガープリント、コンテンツフィルター、互換性バージョンを含みます。パイプラインのフィンガープリント（`packages/core/src/content/content_persistent_cache.ts`の`computePipelineFingerprint`）は、プラグインのフィンガープリント（`pluginFingerprint`から）、コンテンツフィルター（`config.content.filters`）、互換性バージョン（`CONTENT_CACHE_COMPATIBILITY_VERSION`、現在は3）を取り込みます。処理パイプラインが変わったか、コンテンツの再処理が必要かを判断するために使います。

## 関連用語

- [[glossary/build-dependency|Build Dependency]]
- [[cache-invalidation|Cache Invalidation]]
- [[glossary/cache|Cache]]
- [[persistent-cache|Persistent Cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
