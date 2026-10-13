---
title: Build
sidebar:
  hidden: true
---

# Build

Riebeckiteがコンテンツを処理し、公開位置を解決して、manifestとcontent graphを組み立て、出力を書き出す一連の処理です。

## Buildの流れ

1. 設定とPluginを解決します。
2. Markdownなどのコンテンツを読み込みます。
3. Pluginによる変換を実行します。
4. 公開するページとリンクを決めます。
5. サイト全体の情報と必要なassetを集めます。
6. 画像やブラウザ側のコードなどのassetを書き出します。
7. HonoXでサイトをBuildします。

## Full BuildとIncremental Build

`--full`を使うと、以前のBuild情報を使わずにすべてを処理します。Incremental Buildは前回の結果を再利用し、変わった部分だけを処理します。前回のBuild情報は`.riebeckite/build/content-state.json`に保存されています。

## Build State

Build Stateは`.riebeckite/build/content-state.json`に保存され、アプリケーション単位で共有されます。これは最適化のための情報で、正本ではありません。欠落、非互換、安全でない状態ではinitialまたはfullの経路が選ばれます。状態はBuildが成功したあとにだけ保存されるため、失敗しても以前の有効な状態は保たれます。

## 関連用語

- [[incremental-build|Incremental Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[fingerprint|Fingerprint]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
