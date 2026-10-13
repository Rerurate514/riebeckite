---
title: Output Inventory
sidebar:
  hidden: true
---

# Output Inventory

公開entry、redirect、Pluginページ、Generated Outputから作られる、パスをキーにしたすべての生成物の記録です。Buildはこれを前回の成功した状態と比べ、影響する出力、変わっていない出力、削除された出力を求めます。

## 含まれるもの

Buildが所有するすべての出力の一覧です。contentの出力、redirectの出力、Pluginページの出力、Generated Outputを含みます。

## 比較

前回の成功した状態と比べ、影響する出力、変わっていない出力、削除された出力を決めます。どの出力を描画し、再利用し、削除するかはこの比較で決まります。ビルドログは`SSG outputs`の行で`rendered`、`reused`、`removed`の件数を報告します。

## 関連用語

- [[build|Build]]
- [[ssg|SSG]]
- [[glossary/build-dependency|Build Dependency]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
