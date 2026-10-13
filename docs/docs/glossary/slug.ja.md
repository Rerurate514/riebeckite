---
title: Slug
sidebar:
  hidden: true
---

# Slug

ノートの内部的な検索キーで、content index、manifest、content graphが使います。公開URLではないため、公開側では解決済みの公開位置からpermalinkを読みます。

## slugとpermalink

| | slug | permalink |
| --- | --- | --- |
| 対象 | Buildの内部 | 公開URL |
| 由来 | ファイルのパス | 公開位置の解決 |
| 例 | `graph.incoming(slug)` | `<a href={permalink}>` |

## 分けて扱う

slugはファイルの移動で変わりますが、permalinkは設定したURLの規則に従います。slugからURLを再計算するとredirectやlocalizationを飛ばすため、permalinkを読みます。
