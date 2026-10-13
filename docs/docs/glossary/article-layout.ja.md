---
title: 記事レイアウト
sidebar:
  hidden: true
---

# 記事レイアウト

記事レイアウトプリセット (`article`, `sidebar`, `full-width`) は `data-article-layout` 属性を通じて記事エリアの表示を決定します。幅とサイドバーの設定を制御しますが、ルートやコンポーネントツリーを変更しません。

## プリセット

`article` — 基本的な記事レイアウト（サイドエリア付き）
`sidebar` — サイドバー重視のレイアウト
`full-width` — サイドバーなしのフル幅記事

プリセットはテーマルートの `data-article-layout` 属性で設定され、テーマ名でスコープされた CSS ルールで反映されます。

## 境界

Theme はレイアウト プリセントの表示を定義しますが、ルートやコンポーネント ツリーを置き換えません。
アプリケーションがコンポーネント構造を提供し、Theme は data 属性と CSS を通じて表示を提供します。

## 関連用語

- [[glossary/theme|Theme]]
- [[glossary/typography|タイポグラフィ]]
- [[glossary/color-mode|色調モード]]
- [[presentation-layer|プレゼンテーション層]]

## さらに詳しく

- [Theme System](../framework/theme-system.ja.md)
