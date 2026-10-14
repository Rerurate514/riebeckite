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

## Article LayoutのCSSルール
各レイアウトプリセットはTheme Rootの`data-article-layout`属性を使用してCSSルールで反映されます：`:is(:root, .rb-theme-root)[data-article-layout="sidebar"]`はサイドバーの幅とレイアウト構成を制御します。`article`プリセットは標準的なサイドエリア付きの記事を提供し、`full-width`は最大幅でサイドバーを削除します。

```css
:is(:root, .rb-theme-root)[data-article-layout="sidebar"] {
  --rb-layout-sidebar: 300px;
  --rb-layout-article-max: calc(100% - 300px);
}
```

## 境界
Themeはレイアウトプリセットの見た目を定義しますが、routeやコンポーネントツリーは置き換えません。コンポーネントの構造はアプリケーションが用意し、Themeはdata属性とCSSで見た目を提供します。

## 関連用語
- [[glossary/theme|Theme]]
- [[glossary/typography|Typography]]
- [[glossary/color-mode|Color Mode]]
- [[presentation-layer|Presentation Layer]]

## さらに詳しく
- [Theme System](../framework/theme-system.ja.md)