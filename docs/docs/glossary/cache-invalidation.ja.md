---
date: 2026-10-14
title: キャッシュの無効化（Cache Invalidation）
sidebar:
  hidden: true
---

# キャッシュの無効化（Cache Invalidation）

記録した依存関係やフィンガープリントが変わったキャッシュ済みコンテンツを捨てる処理です。無効化されたエントリは再処理され、そのエントリがほかのエントリに影響する場合は変更が伝播します。

## 役割

入力が変わったエントリを取り除きます。
無効化を依存するコンテンツへ推移的に伝播します。

## 起きる場面

キャッシュの無効化は、次の具体的な場面で起きます。

- コンテンツ依存関係のフィンガープリントが変わったとき：永続コンテンツキャッシュのエントリの依存関係が現在のコンテンツと照合されます。`CachedContentDependency`のフィンガープリントが変わっていれば（`packages/core/src/pipeline.ts`の`findInvalidDependency`など）、そのエントリは無効化されます。
- プラグインのprocessedContentCacheの取り決めに反したとき：プラグインの`dependencyMode`が`tracked`で、前回のビルド以降に変わったコンテンツやファイルをCoreのAPI経由で読み込んだ場合、処理済みコンテンツキャッシュのエントリは無効化されます。
- キャッシュのバージョンやスキーマが一致しないとき：キャッシュの検索中に`entry.schemaVersion !== CONTENT_CACHE_SCHEMA_VERSION`（現在は5）であれば、そのエントリは`schema-miss`として扱われ、最初から再処理されます。
- 外部依存関係が変わったとき：外部依存関係のフィンガープリントやスコープが変わると、対応するキャッシュエントリが無効化されます。

## 関連用語

- [[glossary/cache|Cache]]
- [[fingerprint|Fingerprint]]
- [[glossary/build-dependency|Build Dependency]]
- [[plugin-cache|Plugin cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
