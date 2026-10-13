---
title: Cache Invalidation
sidebar:
  hidden: true
---

# Cache Invalidation

記録した依存やfingerprintが変わったcacheのコンテンツを捨てる処理です。無効化したentryは再処理され、他のentryに影響する場合は変化が伝播します。

## 伝播

あるノートが変わると、それをembedするノートや、それを参照する一覧が無効化されます。依存の連鎖を通じて、影響する範囲だけが再処理されます。

## 関連用語

- [[glossary/cache|Cache]]
- [[fingerprint|Fingerprint]]
- [[glossary/build-dependency|Build Dependency]]
- [[plugin-cache|Plugin cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
