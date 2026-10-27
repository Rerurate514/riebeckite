---
date: 2026-10-14
title: 記事レイアウト（Article Layout）
sidebar:
  hidden: true
---
# 記事レイアウト（Article Layout）

記事レイアウトのプリセット（`article`、`sidebar`、`full-width`）は、テーマルートの`data-rb-layout`属性を通じて記事領域の表示を決めます。ルートやコンポーネントツリーを変えずに、幅とサイドバーの構成を制御します。

## プリセット
- `article`：サイドエリア付きの標準的な記事レイアウト
- `sidebar`：サイドバーを重視するレイアウト
- `full-width`：サイドバーのない全幅の記事

プリセットはテーマルートの`data-rb-layout`属性で設定され、テーマ名でスコープしたCSSルールに反映されます。

## 記事レイアウトのCSSルール
各レイアウトプリセットは、テーマルートの`data-rb-layout`属性を使ったCSSルールに反映されます。`:is(:root, .rb-theme-root)[data-rb-layout="sidebar"]`はサイドバーの幅とレイアウト構成を制御します。`article`プリセットはサイドエリア付きの標準的な記事を提供し、`full-width`はサイドバーを取り除いて最大幅にします。

```css
:is(:root, .rb-theme-root)[data-rb-layout="sidebar"] {
  --rb-layout-sidebar: 300px;
  --rb-layout-article-max: calc(100% - 300px);
}
```

## 境界
テーマはレイアウトプリセットの表示を定義しますが、ルートやコンポーネントツリーを置き換えるものではありません。コンポーネントの構造はアプリケーションが提供し、テーマはデータ属性とCSSを通じて表示を提供します。

## 関連用語
- [[glossary/theme|Theme]]
- [[glossary/typography|Typography]]
- [[glossary/color-mode|Color Mode]]
- [[presentation-layer|Presentation Layer]]

## さらに詳しく
- [Theme System](../framework/theme-system.ja.md)
