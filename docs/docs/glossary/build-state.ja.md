---
title: Build State
sidebar:
  hidden: true
---

# Build State

前回のBuildの記録で、entry、fingerprint、依存関係、出力の変更を含みます。

## 保存される内容

`.riebeckite/build/content-state.json`に保存されます。entry、fingerprint、依存関係、pipelineのfingerprint、manifestのentry、出力、外部依存を含みます。次のBuildはこれを読み、Incremental Buildの差分を計算します。

## バージョンと妥当性

バージョンは`CONTENT_BUILD_STATE_VERSION`（現在は12）です。欠落、非互換、不正な状態ではFull Buildの経路が選ばれます。状態はBuildが成功したあとにだけ更新されるため、失敗しても以前の有効な状態は壊れません。

## 関連用語

- [[build|Build]]
- [[incremental-build|Incremental Build]]
- [[fingerprint|Fingerprint]]
- [[output-inventory|Output Inventory]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
