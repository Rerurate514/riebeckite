---
title: Article Layout
sidebar:
  hidden: true
---

# Article Layout

Article Layoutは、記事エリアの幅とサイドバーの構成を決めるプリセットです。`data-article-layout`属性で選び、`article`、`sidebar`、`full-width`の3つを用意します。

## プリセット

- `article`：サイドエリア付きの標準的な記事レイアウト
- `sidebar`：サイドバーを重視したレイアウト
- `full-width`：サイドバーのないフル幅の記事

プリセットはTheme Rootの`data-article-layout`属性で設定し、Theme名でスコープしたCSSルールで反映します。

## 境界

Themeはレイアウトプリセットの見た目を定義しますが、routeやコンポーネントツリーは置き換えません。コンポーネントの構造はアプリケーションが用意し、Themeはdata属性とCSSで見た目を提供します。

## 関連用語

- [[glossary/theme|Theme]]
- [[glossary/typography|Typography]]
- [[glossary/color-mode|Color Mode]]
- [[presentation-layer|Presentation Layer]]

## さらに詳しく

- [Theme System](../framework/theme-system.ja.md)
