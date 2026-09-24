# @riebeckite/theme-gruvbox

温かみのある retro-groove な Gruvbox テーマ: light mode ではバタークリーム
の paper に ink の tint、dark mode ではリッチな charcoal に
`#ebdbb2` 系の ink、全体に signature のバーントオレンジ accent。

[English](./README_en.md)

## 概要

`gruvboxTheme()` は `gruvbox` という名前の theme を作成します。他の
Riebeckite テーマと同じ `ThemeConfig` API と token 契約に従い、design
system を CSS custom properties（`--rb-color-*`、`--rb-font-*`、
`--rb-space-*`、`--rb-layout-*`）として公開し、`@theme` block で Tailwind
theme の値にマップします。

パレットは定番の Gruvbox retro-groove カラーから構成します:

- **Light** — バタークリームの paper（`#fbf1c7`）、温かい charcoal の ink
  （`#282828`）、バーントオレンジの accent（`#d65d0e`）
- **Dark** — リッチな charcoal の paper（`#282828`）、淡い `#ebdbb2` の
  fg ink、明るいオレンジの accent（`#fe8019`）

Tokyo Night テーマと同様に、主張のある base スタイルも適用します: accent の
`caret-color`/`accent-color`、バーントオレンジの `:focus-visible` outline、
揃いの `::selection`、細く accent に染めた scrollbar。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { gruvboxTheme } from "@riebeckite/theme-gruvbox";

export default defineConfig({
  // ...
  theme: gruvboxTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    userCss: [],
  }),
});
```

`defaultTheme()` と同じ `ThemeConfig` API を使うため、設定変更なしでどの
テーマとも差し替えられます。root の `data-theme-name` 属性には
`gruvbox` が設定されます。

## オプション

`gruvboxTheme(options?)` は `name` 以外の `ThemeConfig` を受け取ります:

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

- `gruvboxTheme(options?)` — theme factory
- 型: `GruvboxThemeOptions`
- スタイル: `@riebeckite/theme-gruvbox/style.css`

## 関連

- [Plugin ガイド](../../../docs/plugins_jp.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
- [`@riebeckite/theme-sakura`](../sakura/README_ja.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README_ja.md)