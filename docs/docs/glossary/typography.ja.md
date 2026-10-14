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

## プリセットタイポグラフィ
利用できるプリセットは`system`、`serif`、`sans`の3つです。プリセットはSemantic Token（`--rb-font-body`、`--rb-font-heading`、`--rb-font-mono`）に反映されます。フォントファミリの選択はTheme config（`packages/core/src/types/theme_config.ts`の`ThemeTypographyPreset`型）で定義されます：

- `system`：OS/システムのデフォルトフォントを使用
- `serif`：セリフフォントファミリ（例：Georgia、Libre Baskerville）
- `sans`：sans-serifフォントファミリ（例：system-ui、Inter）

プリセットは`:root[data-typography=...]`CSSルールでフォントファミリを変更します。

## Theme configからCSSへのトークンの流れ
Theme configからTypographyトークンが`data-typography`属Theme rootを通じて流れます。プリセットが選択されると、CSSルール`[data-typography="serif"]`（または`system`/`sans`）がTheme rootをターゲットにし、フォントファミリを置き換えます。コンポーネントCSSを修正せずにプレゼンテーションを変更できます--トークン名（`--rb-font-body`など）はそのままです。のみフォントのマッピングが変わります。

```css
/* Example: serif preset applies */
:root[data-typography="serif"] {
  --rb-font-body: Georgia, serif;
  --rb-font-heading: "Libre Baskerville", serif;
  --rb-font-mono: "Source Code Pro", monospace;
}
```

`data-article-layout`と組み合わせると、記事全体の表示が決定されます。

## ThemeTypographyPreset Type
`packages/core/src/types/theme_config.ts`の`ThemeTypographyPreset`型は`"system" | "serif" | "sans"`のユニオン型です。`ThemeConfig`で使用し、Theme Rootでのフォントファミリマッピングを決定するプリセットを選択します。

## Theme RootのタイポグラフィCSS
プリセットは`data-typography`属性を使用してTheme RootでCSSルールが反映されます：`:is(:root, .rb-theme-root)[data-typography="serif"]`は意味的なトークン`--rb-font-body`、`--rb-font-heading`、`--rb-font-mono`のフォントファミリを入れ替えます。プリセットの変更は純粋にプレゼンテーション的なもので、トークン名はそのままです--のみフォントのマッピングが変わります。

```css
:is(:root, .rb-theme-root)[data-typography="serif"] {
  --rb-font-body: Georgia, serif;
  --rb-font-heading: "Libre Baskerville", serif;
  --rb-font-mono: "Source Code Pro", monospace;
}
```

## 関連用語
- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|Semantic Token]]
- [[article-layout|Article Layout]]

## さらに詳しく
- [Typography](../framework/theme-system/typography.ja.md)