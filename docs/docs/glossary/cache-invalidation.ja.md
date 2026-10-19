---
title: Cache Invalidation
sidebar:
  hidden: true
---

# Cache Invalidation

記録した依存やfingerprintが変わったcacheのコンテンツを捨てる処理です。無効化したentryは再処理され、他のentryに影響する場合は変化が伝播します。

## 無効化のトリガー

キャッシュ無効化は以下の具体的なシナリオでトリガーされます：

- content依存のfingerprintが変わったとき：永続的content cache entryのdependenciesが現在のcontentと照合されます。`CachedContentDependency`のfingerprintが変わった場合（`packages/core/src/pipeline.ts`の`findInvalidDependency`経由など）、entryは無効化されます。
- pluginのprocessedContentCacheの取り決めに違反したとき：pluginの`dependencyMode`が`tracked`で、last build以来変更されたcontentやfileをCore API経由で読み込んだ場合、処理済みcontent cache entryは無効化されます。
- cache versionの不一致やschemaの不一致時：cache lookup中に`entry.schemaVersion !== CONTENT_CACHE_SCHEMA_VERSION`（現在は5）の場合、entryは`schema-miss`として扱われ、最初から再処理されます。
- external dependencyが変わったとき：external dependencyのfingerprintまたはscopeが変化した場合、対応するcache entryは無効化されます。

## 関連用語

- [[glossary/cache|Cache]]
- [[fingerprint|Fingerprint]]
- [[glossary/build-dependency|Build Dependency]]
- [[plugin-cache|Plugin cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
