# @riebeckite/theme-minimal

意図的に装飾を削った Riebeckite の baseline テーマ: モノクロの paper/ink で、
装飾的な base スタイルを持ちません。Theme authoring の全ルールの reference
実装として、または自作テーマの blank canvas として使えます。

[English](./README_en.md)

## 概要

`minimalTheme()` は `minimal` という名前の theme を作成します。これは
[Theme authoring 契約](../../../docs/theme_authoring_jp.md) に従った最小の
有効な Theme です: `--rb-*` semantic tokens 一式を公開し、`@theme` block に
マップして、token 値以外には一切手を加えません — `data-*` attributes も、
`html`/`body`/`::selection`/`:focus-visible` 以外の base rule もありません。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  // ...
  theme: minimalTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    userCss: [],
  }),
});
```

`defaultTheme()` と同じ `ThemeConfig` API を使うため、設定変更なしでどの
テーマとも差し替えられます。root の `data-theme-name` 属性には
`minimal` が設定されます。

## オプション

`minimalTheme(options?)` は `name` 以外の `ThemeConfig` を受け取ります:

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

- `minimalTheme(options?)` — theme factory
- 型: `MinimalThemeOptions`
- スタイル: `@riebeckite/theme-minimal/style.css`

## 関連

- [Theme authoring 契約](../../../docs/theme_authoring_jp.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
- [`@riebeckite/theme-sakura`](../sakura/README_ja.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README_ja.md)
- [`@riebeckite/theme-gruvbox`](../gruvbox/README_ja.md)
- [`@riebeckite/theme-rerurate`](../rerurate/README_ja.md)