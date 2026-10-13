---
title: Cache Invalidation
sidebar:
  hidden: true
---

# Cache Invalidation

記録した依存や fingerprint が変わった cache のコンテンツを捨てる処理です。無効化した entry は再処理され、他の entry に影響する場合は変化が伝播します。

## 役割

- 入力が変わった entry を取り除きます。
- 依存するコンテンツへ無効化を伝播します。

## 関連用語

- [[glossary/cache|Cache]]
- [[fingerprint|Fingerprint]]
- [[glossary/build-dependency|Build Dependency]]
- [[plugin-cache|Plugin Cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
- [Build Dependency Contract](../framework/build-dependency.ja.md)
