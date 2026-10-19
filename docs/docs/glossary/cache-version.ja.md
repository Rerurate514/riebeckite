---
title: Cache Version
sidebar:
  hidden: true
---
# Cache Version

永続的なcontent cacheのスキーマのバージョンで、スキーマの変更にともなう互換性と移行を制御します。

## スキーマのバージョン

`CONTENT_CACHE_SCHEMA_VERSION`（現在は5）は、cacheの構造が変わったときに上げます。`CONTENT_CACHE_COMPATIBILITY_VERSION`（現在は3）は、振る舞いや取り決めが変わったときに変えます。スキーマのバージョンが合わないentryはmissとして扱われ、再処理されます。

## 移行

スキーマのバージョンが合わないときは`.riebeckite/cache`を削除し、コールドビルドを強制します。ビルドログは、互換性のないスキーマのバージョンを持つcacheのentryがあると`schema-miss`を報告します。

## スキーマバージョン定数

キャッシュのバージョン管理は`packages/core/src/content/content_persistent_cache.ts`で定義された2つの定数によって制御されます：

- **CONTENT_CACHE_SCHEMA_VERSION**（現在は**5**）: cacheの構造が変わったときに上げます。スキーマのバージョンが合わないentryはmissとして扱われ、再処理されます。
- **CONTENT_CACHE_COMPATIBILITY_VERSION**（現在は**3**）: 振る舞いや取り決めが変わったときに変えます。

## キャッシュ検索バージョン互換性

キャッシュ検索中、`createPersistentContentCache`の`lookup`メソッドは`entry.schemaVersion !== CONTENT_CACHE_SCHEMA_VERSION`をチェックします。バージョンが異なれば、entryは`schema-miss`として扱われ、最初から再処理されます。これにより、cacheスキーマの構造変更は常に次のビルドで反映されます。

## cache entryの構造

永続的content cache entry (`PersistentContentCacheEntry`type in `packages/core/src/content/content_persistent_cache.ts`) structure:

```json
{
  "schemaVersion": 5,
  "key": "<computed cache key>",
  "dependencies": [
    { "kind": "content", "id": "slug-name", "fingerprint": "sha256 hash" },
    { "kind": "file", "id": "path/to/file", "fingerprint": "sha256 hash" },
    { "kind": "link", "id": "link-target-slug", "fingerprint": "sha256 hash" }
  ],
  "value": {
    "frontmatter": { "title": "Example", "date": "2024" },
    "html": "<p>processed HTML</p>"
  }
}
```

entryは`schemaVersion`(現在は5)を含みます。`key`は`computeContentCacheKey`からslug、source、frontmatter、pipeline fingerprintで計算します。`dependencies`は`CachedContentDependency`recordsの配列、`value`はfrontmatterとHTMLです。lookup中に`entry.key !== key`の場合、entryは`key-miss`として扱われます。

## Related terms

- [[glossary/cache|Cache]]
- [[persistent-cache|Persistent Cache]]
- [[fingerprint|Fingerprint]]
- [[glossary/cache-version|Cache Version]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)