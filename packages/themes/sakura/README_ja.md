# @riebeckite/theme-sakura

Riebeckite の桜（sakura）テーマ: 淡いピンクの paper・深いプラムの ink・
sakura pink の accent を、light / dark 両方の color mode で提供します。

[English](./README_en.md)

## 概要

`sakuraTheme()` は `sakura` という名前の theme を作成します。default theme
と同じく、design system を CSS custom properties（`--rb-color-*`、
`--rb-font-*`、`--rb-space-*`、`--rb-layout-*`）として公開し、`@theme`
block で Tailwind theme の値にマップします。そのため tokens は素の CSS
からも Tailwind 系の utility からも使えます。

パレットは桜をイメージしています:

- **Light** — 桜色の白い paper（`#fff8fa`）、深いプラムの ink
  （`#4a2a3a`）、sakura pink の accent（`#e8789f`）
- **Dark** — 深いプラム黒の paper（`#241520`）、淡い桜色の ink
  （`#f9e4ec`）、より明るい sakura pink の accent（`#f4a3c2`）

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  // ...
  theme: sakuraTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    userCss: [],
  }),
});
```

`defaultTheme()` と同じ `ThemeConfig` API を使うため、他の設定変更なしに
2 つのテーマを入れ替えられます。root の `data-theme-name` 属性には
`sakura` が設定されます。

## オプション

`sakuraTheme(options?)` は `name` 以外の `ThemeConfig` を受け取ります:

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

- `sakuraTheme(options?)` — theme factory
- 型: `SakuraThemeOptions`
- スタイル: `@riebeckite/theme-sakura/style.css`

## 関連

- [Plugin ガイド](../../../docs/plugins_jp.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)