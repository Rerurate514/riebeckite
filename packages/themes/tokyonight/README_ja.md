# @riebeckite/theme-tokyonight

主張が強い Tokyo Night テーマ: ハイコントラストな twilight の day mode と、
定番の深い indigo の night mode。エレクトリックブルーの accent と
magenta / neon のニュアンスを備えています。

[English](./README_en.md)

## 概要

`tokyonightTheme()` は `tokyonight` という名前の theme を作成します。他の
Riebeckite テーマと同じ `ThemeConfig` API と token 契約に従い、design
system を CSS custom properties（`--rb-color-*`、`--rb-font-*`、
`--rb-space-*`、`--rb-layout-*`）として公開し、`@theme` block で Tailwind
theme の値にマップします。

控えめな default theme と比べて、Tokyo Night はコントラストを強調します:

- **Light（"day"）** — たそがれ色の白 paper（`#e1e2e7`）に深い indigo ink
  （`#343b58`）、エレクトリックブルーの accent（`#2e7de9`）
- **Dark（"night"）** — 定番の Tokyo Night 背景 `#1a1b26` に淡い fuji-blue
  ink（`#c0caf5`）、光る `#7aa2f7` accent

tokens に加えて、主張のある base スタイルも適用します: accent 色の
`caret-color`/`accent-color`、エレクトリックな `:focus-visible` outline、
neon 調の `::selection`、細く accent に染めた scrollbar。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { tokyonightTheme } from "@riebeckite/theme-tokyonight";

export default defineConfig({
  // ...
  theme: tokyonightTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    userCss: [],
  }),
});
```

`defaultTheme()` と同じ `ThemeConfig` API を使うため、他の設定変更なしに
テーマを差し替えられます。root の `data-theme-name` 属性には
`tokyonight` が設定されます。

## オプション

`tokyonightTheme(options?)` は `name` 以外の `ThemeConfig` を受け取ります:

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | 色モード。`system` は `data-theme` が無い限り `prefers-color-scheme` に従う |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | タイポグラフィ preset。`data-typography` 属性経由で適用 |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | 記事レイアウト preset。`data-article-layout` を読む側のための値 |
| `tokens` | `ThemeDesignTokens` | `{}` | design tokens の上書き（色・フォント・spacing・レイアウト幅） |
| `userCss` | `string[]` | `[]` | 追加のユーザー stylesheet |

token 一覧の詳細は [`@riebeckite/theme-default`](../default/README_ja.md) の
README を参照してください。token の契約は同一です。

## エクスポート

- `tokyonightTheme(options?)` — theme factory
- 型: `TokyonightThemeOptions`
- スタイル: `@riebeckite/theme-tokyonight/style.css`

## 関連

- [Plugin ガイド](../../../docs/plugins_jp.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
- [`@riebeckite/theme-sakura`](../sakura/README_ja.md)