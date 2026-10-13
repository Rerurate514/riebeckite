---
title: Cache Version
sidebar:
  hidden: true
---

# Cache Version

永続的なcontent cacheのスキーマのバージョンで、スキーマの変更にともなう互換性と移行を制御します。

## スキーマのバージョン

`CONTENT_CACHE_SCHEMA_VERSION`（現在は4）は、cacheの構造が変わったときに上げます。`CONTENT_CACHE_COMPATIBILITY_VERSION`（現在は3）は、振る舞いや契約が変わったときに変えます。スキーマのバージョンが合わないentryはmissとして扱われ、再処理されます。

## 移行

スキーマのバージョンが合わないときは`.riebeckite/cache`を削除し、コールドビルドを強制します。ビルドログは、互換性のないスキーマのバージョンを持つcacheのentryがあると`schema-miss`を報告します。

## 関連用語

- [[glossary/cache|Cache]]
- [[persistent-cache|Persistent Cache]]
- [[fingerprint|Fingerprint]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
