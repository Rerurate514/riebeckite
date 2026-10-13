---
title: Typography
sidebar:
  hidden: true
---

# Typography

Typographyは、フォントファミリ、サイズ、行間といったサイトの組版の設定です。`system`、`serif`、`sans`のプリセットを`data-typography`属性でTheme Rootに適用します。

## プリセット

利用できるプリセットは`system`、`serif`、`sans`の3つです。プリセットはSemantic Token（`--rb-font-body`、`--rb-font-heading`、`--rb-font-mono`）に反映されます。プリセットを変えると、CSSルール`:root[data-typography=...]`でフォントファミリが変わります。

## Article Layout

TypographyとArticle Layoutは連携してテキストの表示を決めます。`data-typography`属性はTheme Root（`[data-theme-root]`または`<html>`）に適用します。`data-article-layout`と組み合わせて、記事全体の表示を決めます。

## 関連用語

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|Semantic Token]]
- [[article-layout|Article Layout]]

## さらに詳しく

- [Typography](../framework/theme-system/typography.ja.md)
