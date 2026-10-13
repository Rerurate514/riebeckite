---
title: Build Dependency
sidebar:
  hidden: true
---

# Build Dependency

あるコンテンツや出力に影響する入力の宣言で、別のノート、ファイル、tag、folder などがあります。依存を記録することで、Core は変化が影響し得る分だけを無効化できます。

## 役割

- 変換が何に依存するかを宣言します。
- Build 中の狙いを定めた無効化を可能にします。

## 関連用語

- [[fingerprint|Fingerprint]]
- [[cache-invalidation|Cache Invalidation]]
- [[incremental-build|Incremental Build]]
- [[output-inventory|Output Inventory]]

## さらに詳しく

- [Build Dependency Contract](../framework/build-dependency.ja.md)
- [Build System](../framework/build-system.ja.md)
