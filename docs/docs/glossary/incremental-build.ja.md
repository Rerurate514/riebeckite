---
title: Incremental Build
sidebar:
  hidden: true
---

# Incremental Build

content dependency と保存した build state を使って、変わった分だけを再生成する Build の mode です。宣言した入力が変わっていなければ、未変更のコンテンツと出力を再利用します。

## 役割

- 未変更のコンテンツと出力の再処理を避けます。
- 記録した依存と build state に基づきます。

## 関連用語

- [[build|Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[glossary/build-dependency|Build Dependency]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
