---
title: Build State
sidebar:
  hidden: true
---

# Build State

build ディレクトリに保存される前回 Build の記録で、entry、fingerprint、依存、出力の変更を持ちます。次の Build がこれを読み、何を再処理するかを計算します。

## 役割

- Build 間にまたがって fingerprint と依存を保ちます。
- 次の Build が差分を計算できるようにします。

## 関連用語

- [[build|Build]]
- [[incremental-build|Incremental Build]]
- [[fingerprint|Fingerprint]]
- [[output-inventory|Output Inventory]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
