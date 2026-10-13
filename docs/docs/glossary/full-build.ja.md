---
title: フルビルド
sidebar:
  hidden: true
---

# フルビルド

以前のインクリメンタルステートを再利用せず、すべてのコンテンツをスクラッチから処理するビルドです。

## 使うべきタイミング

`--full` を使ってビルドを再現する、あるいは incremental ビヘイビアの問題を切り分ける場合に使用する。
ビルド時間の比較や、 incremental ビルドの結果が疑わしいときに有用です。

## コマンド

`riebeckite build --full`
あるいは
`pnpm exec riebeckite build --full`

## 関連用語

- [[build|ビルド]]
- [[incremental-build|インクリメンタルビルド]]
- [[check|Check]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
