---
title: 未使用アセット
sidebar:
  hidden: true
---

# 未使用アセット

 content の frontmatter や content で参照されていないアセット（画像、ファイルなど）です。出力サイズを削減するために安全に削除できる可能性がある。

## 追跡

 assets は content の `assets` フィールドや link 参照を通じて追跡される。
 どこにも追跡されていないアセットは unused とみなされる。

## cleanup

 unused asset は正しさに影響しないが、サイズ最適化のために削除できる。
 published site で参照されていないアセットを特定するには `doctor` または `inspect` を使用する。

## 関連用語

- [[orphan|孤立したコンテンツ]]
- [[asset|Asset]]
- [[glossary/content|Content]]

## さらに詳しく

- [Diagnostics](../framework/diagnostics.ja.md)
