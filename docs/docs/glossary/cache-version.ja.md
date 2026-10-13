---
title: Cache バージョン
sidebar:
  hidden: true
---

# Cache バージョン

 persistent content cache のスキーマバージョンで、キャッシュのスキーマ変更に伴う互換性とマイグレーションを制御する。

## スキーマバージョン

 CONTENT_CACHE_SCHEMA_VERSION (現在は 4) はキャッシュ構造が変更されたときにインクリメントされる。
 CONTENT_CACHE_COMPATIBILITY_VERSION (現在は 3) は behavior や contract が変更されたときに変更される。
 スキーマバージョンが合致しないエントリは miss として扱われ、再処理される。

## マイグレーション

 スキーマバージョンが合わない場合は `.riebeckite/cache` を削除して cold build を強制する。
 build log は cache entry が互換性のないスキーマバージョンを持つとき `schema-miss` を報告する。

## 関連用語

- [[glossary/cache|Cache]]
- [[persistent-cache|永続キャッシュ]]
- [[fingerprint|フィンガープリント]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
