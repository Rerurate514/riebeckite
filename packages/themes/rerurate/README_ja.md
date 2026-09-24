# @riebeckite/theme-rerurate

Rerurate Visual Grammar に基づく Riebeckite テーマ: 温かい
Paper / Ink のフラットな面、signature の Orange accent、1px rule、
8px grid。

[English](./README_en.md)

## 概要

`rerurateTheme()` は `rerurate` という名前の theme を作成します。他の
Riebeckite テーマと同じ `ThemeConfig` API と token 契約に従い、design
system を CSS custom properties（`--rb-color-*`、`--rb-font-*`、
`--rb-space-*`、`--rb-layout-*`）として公開し、`@theme` block で Tailwind
theme の値にマップします。

パレットは Rerurate ブランドです:

- **Light** — 温かい Paper（`#f6efe2`）、Ink（`#171717`）、signature の
  Orange（`#f66620`）
- **Dark** — 温かい charcoal の paper（`#1c1a17`）に Paper 系 ink
  （`#f6efe2`）。Orange（`#f66620`）は accent のまま

stylesheet に反映した Rerurate grammar の判断:

- **フラットな面** — shadow / blur / glassmorphism は使わない
- **1px rule** — `--rb-rule-width: 1px` と細い scrollbar
- **選択** — Orange + Paper のブランド仕様
  （`background: orange; color: paper`）
- **フォーカス** — 明確な Orange の `:focus-visible` outline
- **8px grid** — `--rb-space-*` tokens は 8px 基準に従う
- **Futura / Helvetica-family** の Latin スタック + システム日本語フォールバック
- design layer 向けに、semantic な `--rr-*` tokens（`--rr-color-paper`、
  `--rr-color-ink`、`--rr-color-orange`、`--rr-space-1..4`、
  `--rr-rule-width`）も公開
- **Orange initial** — 強力な Rerurate の signature だが全ページへ機械的に
  適用しない（opt-in の `initial` オプションで有効化）

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  // ...
  theme: rerurateTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    initial: true,
    userCss: [],
  }),
});
```

`defaultTheme()` と同じ `ThemeConfig` API を使うため、設定変更なしでどの
テーマとも差し替えられます。root の `data-theme-name` 属性には
`rerurate` が設定されます。

## オプション

`rerurateTheme(options?)` は `name` 以外の `ThemeConfig` を受け取り、加えて
テーマ固有オプション `initial` を提供します:

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `initial` | `boolean` | `false` | 記事本文の先頭段落の最初の文字を大きめの Orange の initial にする（`data-rerurate-initial="on"` 属性で適用） |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | 色モード。`system` は `data-theme` が無い限り `prefers-color-scheme` に従う |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | タイポグラフィ preset。`data-typography` 属性経由で適用 |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | 記事レイアウト preset。`data-article-layout` を読む側のための値 |
| `tokens` | `ThemeDesignTokens` | `{}` | design tokens の上書き（色・フォント・spacing・レイアウト幅） |
| `userCss` | `string[]` | `[]` | 追加のユーザー stylesheet |

テーマ固有オプションは safe な `data-*` 属性（`data-rerurate-initial`）として
root 要素に適用されます。`initial` は `config` からも直接
`attributes: { "data-rerurate-initial": "on" }` で上書きできます。

token 一覧の詳細は [`@riebeckite/theme-default`](../default/README_ja.md) の
README を参照してください。token の契約は同一です。Red / Green は機能的な
`danger` / `success` token だけに使っています。

## エクスポート

- `rerurateTheme(options?)` — theme factory
- 型: `RerurateThemeOptions`
- スタイル: `@riebeckite/theme-rerurate/style.css`

## 関連

- [Plugin ガイド](../../../docs/plugins_jp.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
- [`@riebeckite/theme-sakura`](../sakura/README_ja.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README_ja.md)
- [`@riebeckite/theme-gruvbox`](../gruvbox/README_ja.md)