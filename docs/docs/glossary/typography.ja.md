---
date: 2026-10-14
title: タイポグラフィ（Typography）
sidebar:
  hidden: true
---
# タイポグラフィ（Typography）

フォントファミリ、サイズ、行間といったサイトの組版設定です。テーマルートの `data-typography` 属性を通じて、テーマのプリセット（`system`、`serif`、`sans`）で適用します。

## プリセット
`system`、`serif`、`sans` の3つのタイポグラフィプリセットがあります。プリセットはセマンティックなフォントトークン（`--rb-font-body`、`--rb-font-heading`、`--rb-font-mono`）に反映されます。プリセットを変えると、`:root[data-typography=...]` のCSSルールでフォントファミリが変わります。

## 記事レイアウト
タイポグラフィと記事レイアウトは連携してテキストの見せ方を決めます。`data-typography` 属性はテーマルート（`[data-theme-root]` または `<html>`）に適用します。`data-article-layout` と組み合わせると、記事全体の見せ方が決まります。

## タイポグラフィプリセットの種類
`system`、`serif`、`sans` の3つのプリセットがあります。プリセットはセマンティックなフォントトークン（`--rb-font-body`、`--rb-font-heading`、`--rb-font-mono`）に反映されます。フォントファミリの選択は、テーマ設定のプリセット（`packages/core/src/types/theme_config.ts` の `ThemeTypographyPreset` 型）で定義されます。

- `system` — OS/システムの既定フォントを使う
- `serif` — セリフフォントファミリを使う（例：Georgia、Libre Baskerville）
- `sans` — サンセリフフォントファミリを使う（例：system-ui、Inter）

プリセットはテーマルートの `:root[data-typography=...]` CSSルールでフォントファミリを変えます。

## テーマ設定からCSSへのトークンの流れ
タイポグラフィのトークンは、テーマ設定からテーマルートの `data-typography` 属性を通じてCSSへ流れます。プリセットが選ばれると、CSSルール `[data-typography="serif"]`（または `system`/`sans`）がテーマルートを対象にし、フォントファミリの値を入れ替えます。コンポーネントのCSSを変えずに表示を変更でき、トークン名（`--rb-font-body` など）はそのままで、変わるのはフォントのマッピングだけです。

```css
/* Example: serif preset applies */
:root[data-typography="serif"] {
  --rb-font-body: Georgia, serif;
  --rb-font-heading: "Libre Baskerville", serif;
  --rb-font-mono: "Source Code Pro", monospace;
}
```

`data-article-layout` と組み合わせると、記事全体の見せ方が決まります。

## ThemeTypographyPreset型
`packages/core/src/types/theme_config.ts` の `ThemeTypographyPreset` 型は `"system" | "serif" | "sans"` のユニオン型です。この型は `ThemeConfig` で使い、テーマルートでのフォントファミリのマッピングを決めるタイポグラフィプリセットを選びます。

## テーマルートのタイポグラフィCSS
プリセットは、テーマルートの `data-typography` 属性を使ったCSSルールに反映されます。`:is(:root, .rb-theme-root)[data-typography="serif"]` が、セマンティックトークン `--rb-font-body`、`--rb-font-heading`、`--rb-font-mono` のフォントファミリを入れ替えます。プリセットの変更は表示だけにとどまり、トークン名はそのままで、変わるのはフォントのマッピングだけです。

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
