---
title: Full Build
sidebar:
  hidden: true
---

# Full Build

以前のBuild情報を使わず、すべてのコンテンツを最初から処理するBuildです。Incremental Buildが使えないときの経路になります。

## 使われる場面

`--full`は以下のときに自動的に選択されます：
- 前回のBuild状態がない（初回のBuild）
- 前回のBuild状態のバージョンが現在のバージョンと互換性がない
- pipeline fingerprintが変更され、以前の状態が再利用できない安全でない状態となっている
- cache schemaのバージョン不一致により、有効なcache entryを参照できない
- External dependencyの失敗によりIncremental処理が防げる

`--full`が指定された場合でも、同じ正しいウェブサイトが生成されます。違いは、incremental stateを再利用せずすべてのコンテンツを最初から処理する点で、incrementalビルドの結果を比較したりincrementalビルドの問題を隔離したりするのに便利です。

## 関連用語

- [[build|Build]]
- [[incremental-build|Incremental Build]]
- [[check|Check]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
