---
title: タイポグラフィ
sidebar:
  hidden: true
---

# タイポグラフィ

サイトのタイポグラフィック設定 — フォントファミリ、サイズ、行高 — は `system`, `serif`, `sans` のテーマプリセットを通じて `data-typography` 属性でテーマルートに適用されます。

## プリセット

利用可能なタイポグラフィ プリセットは3つです: `system`, `serif`, `sans`。
プリセットは意味的フォント トークン (--rb-font-body, --rb-font-heading, --rb-font-mono) に反映されます。
プリセットを変更すると、CSS ルール `:root[data-typography=...]` でフォントファミリが変更されます。

## 記事レイアウト

タイポグラフィと記事レイアウトはテキスト表示を制御するために連携します。
`data-typography` 属性はテーマルート ([data-theme-root] または `<html>`) に適用されます。
`data-article-layout` と組み合わせて、記事全体の表示が決定されます。

## 関連用語

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|セマンティック トークン]]
- [[article-layout|記事レイアウト]]

## さらに詳しく

- [Typography](../framework/theme-system/typography.ja.md)
