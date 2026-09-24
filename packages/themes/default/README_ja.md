# @riebeckite/theme-default

Riebeckite のデフォルト theme: design tokens・light/dark color mode・
typography preset・article layout を CSS で提供します。

[English](./README_en.md)

## 概要

`defaultTheme()` は `riebeckite` という名前の built-in theme を作成します。
design system を CSS custom properties（`--rb-color-*`、`--rb-font-*`、
`--rb-space-*`、`--rb-layout-*`）として公開し、`@theme` block で Tailwind
theme の値にマップします。そのため tokens は素の CSS からも Tailwind 系の
utility からも使えます。

`riebeckite.config.ts` で `config.theme` を省略した場合、自動的にこの theme
が使われます。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  // ...
  theme: defaultTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    userCss: [],
  }),
});
```

## オプション

`defaultTheme(options?)` は `name` 以外の `ThemeConfig` を受け取ります:

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | 色モード。`system` は `data-theme` が無い限り `prefers-color-scheme` に従う |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | タイポグラフィ preset。`data-typography` 属性経由で適用 |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | 記事レイアウト preset。`data-article-layout` を読む側のための値 |
| `tokens` | `ThemeDesignTokens` | `{}` | design tokens の上書き（色・フォント・spacing・レイアウト幅） |
| `userCss` | `string[]` | `[]` | 追加のユーザー stylesheet |

## Design tokens

stylesheet は custom properties を定義し、Riebeckite 全体で利用されます。

- **色** — `--rb-color-paper`、`-ink`、`-muted`、`-accent`、`-border`、
  `-border-strong`、`-surface`、`-surface-hover`、`-overlay`、`-danger`、
  `-success`、`-code-background` を light / dark /
  `prefers-color-scheme` の各 variant で定義
- **タイポグラフィ** — `--rb-font-body`、`--rb-font-heading`、
  `--rb-font-mono`。`serif`/`sans` preset は
  `:root[data-typography=...]` で body/heading のフォントを切替
- **Spacing とレイアウト** — `--rb-space-1..8`、`--rb-rule-width`、
  `--rb-layout-page-max`、`--rb-layout-article-max`、`--rb-layout-sidebar`、
  `--rb-layout-gap`

root 要素に `data-theme="dark"`（または `"light"`）を設定すると色モードを
固定でき、`colorMode: "system"` の場合は unset のまま OS に追従します。

## エクスポート

- `defaultTheme(options?)` — theme factory
- 型: `DefaultThemeOptions`
- スタイル: `@riebeckite/theme-default/style.css`

## 関連

- [Plugin ガイド](../../../docs/plugins_jp.md)