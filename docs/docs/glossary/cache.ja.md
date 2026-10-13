---
title: Cache
sidebar:
  hidden: true
---

# Cache

保存して共有できる再利用可能な Build のデータで、cache の設定で構成します。Cache は最適化であり、entry の欠落や無効はエラーではなく安全な miss です。

## 役割

- Build 間で処理済みコンテンツを再利用します。
- 最適化にすぎないため削除しても安全です。

## 関連用語

- [[plugin-cache|Plugin Cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[build-state|Build State]]
- [[incremental-build|Incremental Build]]

## さらに詳しく

- [Cache](../reference/configuration/cache.ja.md)
- [Build System](../framework/build-system.ja.md)
