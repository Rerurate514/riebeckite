---
title: Full Build
sidebar:
  hidden: true
---

# Full Build

以前のBuild情報を使わず、すべてのコンテンツを最初から処理するBuildです。Incremental Buildが使えないときの経路になります。

## 使われる場面

Build Stateやcacheのentryが欠落、非互換、安全でない場合に選ばれます。`--full`を指定して明示的に実行することもできます。

## 関連用語

- [[build|Build]]
- [[incremental-build|Incremental Build]]
- [[check|Check]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
