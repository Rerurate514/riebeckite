---
title: Slug
sidebar:
  hidden: true
---

# Slug

ノートの内部的な検索キーで、content index、manifest、content graph が使います。公開 URL ではないため、公開側では解決済みの公開位置から permalink を読みます。

## slug と permalink

| | slug | permalink |
| --- | --- | --- |
| 対象 | Build の内部 | 公開 URL |
| 由来 | ファイルのパス | 公開位置の解決 |
| 例 | `graph.incoming(slug)` | `<a href={permalink}>` |

## 分けて扱う

slug はファイルの移動で変わりますが、permalink は設定した URL の規則に従います。slug から URL を再計算すると redirect や localization を飛ばすため、permalink を読みます。
