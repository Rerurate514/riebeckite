---
date: 2026-10-14
title: キャッシュバージョン（Cache Version）
sidebar:
  hidden: true
---
# キャッシュバージョン（Cache Version）

永続コンテンツキャッシュのスキーマバージョンで、キャッシュスキーマ間の互換性と移行を制御します。

## スキーマバージョン

`CONTENT_CACHE_SCHEMA_VERSION`（現在は5）は、キャッシュの構造が変わったときに上がります。
`CONTENT_CACHE_COMPATIBILITY_VERSION`（現在は3）は、振る舞いや取り決めが変わったときに変わります。
スキーマバージョンが一致しないエントリはミスとして扱われ、再処理されます。

## 移行

スキーマバージョンが一致しないときは`.riebeckite/cache`を削除し、コールド処理を強制します。
ビルドログは、互換性のないスキーマバージョンを持つキャッシュエントリがあると`schema-miss`を報告します。

## スキーマバージョンの定数

キャッシュのバージョン管理は、`packages/core/src/content/content_persistent_cache.ts`で定義された2つの定数で制御します。

- **CONTENT_CACHE_SCHEMA_VERSION**（現在は**5**）：キャッシュの構造が変わったときに上がります。スキーマバージョンが一致しないエントリはミスとして扱われ、再処理されます。
- **CONTENT_CACHE_COMPATIBILITY_VERSION**（現在は**3**）：振る舞いや取り決めが変わったときに変わります。

## キャッシュ検索時の互換性チェック

キャッシュ検索では、`createPersistentContentCache`（`packages/core/src/content/content_persistent_cache.ts`）の`lookup`メソッドが`entry.schemaVersion !== CONTENT_CACHE_SCHEMA_VERSION`を確認します。バージョンが異なれば、エントリは`schema-miss`として扱われ、最初から再処理されます。これにより、キャッシュスキーマの構造変更は必ず次のビルドで反映されます。

## キャッシュエントリの構造

永続コンテンツキャッシュのエントリ（`packages/core/src/content/content_persistent_cache.ts`の`PersistentContentCacheEntry`型）の構造は次のとおりです。

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

エントリは`schemaVersion`（現在は5）、`key`（slug、source、frontmatter、パイプラインのフィンガープリントから`computeContentCacheKey`で計算）、`dependencies`（`CachedContentDependency`レコードの配列）、`value`（frontmatterとHTML）を含みます。検索中に`entry.key !== key`であれば、エントリは`key-miss`として扱われます。

## 関連用語

- [[glossary/cache|Cache]]
- [[persistent-cache|Persistent Cache]]
- [[fingerprint|Fingerprint]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
