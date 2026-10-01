# @riebeckite/theme-gruvbox

Gruvbox の温かい配色を Riebeckite のテーマにしたものです。明るい配色ではクリーム色の紙に焦げ茶の文字、暗い配色ではチャコールの背景に `#ebdbb2` の文字を載せ、リンクや操作要素には Gruvbox の青を使います。

[English](./README.md)

## 概要

`gruvboxTheme()` は `gruvbox` という名前のテーマを作ります。他の Riebeckite テーマと同じ `ThemeConfig` API とトークン契約に従い、デザイントークンを CSS カスタムプロパティ（`--rb-color-*`、`--rb-font-*`、`--rb-space-*`、`--rb-layout-*`）として公開したうえで、`@theme` ブロックで Tailwind の値に対応づけます。

配色の差し替えだけでなく、見た目の性格も持たせています。見出しは温かいインク色で大きさの段階をはっきりつけ、`h2` の下に 1px の罫線を引きます。リンクは青、ホバーで下線。引用は灰色の左罫線で平らにまとめ、表は細い罫線と淡く色づけたヘッダー行、プラグインの面は 1px 罫線と小さめの角丸（2px）で統一します。グラデーションや影は使わず、角は控えめ、動きは付けません。本文は長文を読みやすい行間と、まぶしさを抑えた面で構成しています。

入力要素のアクセント色、キーボード操作時のフォーカス枠、テキスト選択、スクロールバーにも Gruvbox の色を適用します。フォーカス枠は明るい配色でオレンジ、暗い配色で黄色にして、どちらでも見つけやすくしています。

配色には Gruvbox の原典の値を使っています（[出典](#出典)を参照）。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { gruvboxTheme } from "@riebeckite/theme-gruvbox";

export default defineConfig({
  // ...
  theme: gruvboxTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    contrast: "hard",
    userCss: [],
  }),
});
```

テーマ名は `gruvbox` です。他の Riebeckite テーマと同じ `ThemeConfig` を受け取るため、基本設定を保ったまま差し替えられます。

## 明るい配色と暗い配色

- **明るい配色** — `bg0` の紙、`dark1` 相当の文字、Gruvbox の暗い側のアクセント（例: 背景 `#fbf1c7`、文字 `#3c3836`、アクセント `#076678`）
- **暗い配色** — `bg0` の紙、`light1` の文字、Gruvbox の明るい側のアクセント（例: 背景 `#282828`、文字 `#ebdbb2`、アクセント `#83a598`）

`colorMode: "system"` は `data-theme` が付いていないかぎり `prefers-color-scheme` に従います。どちらの配色でもアクセントの役割は同じで、使う Gruvbox の色だけが明るい側・暗い側で入れ替わります。

`contrast` は古典的な Gruvbox の `bg0` に対応し、ページの紙色を選びます。

- 暗い配色: `soft` = `dark0_soft`、`medium` = `dark0`、`hard` = `dark0_hard`
- 明るい配色: `soft` = `light0_soft`、`medium` = `light0`、`hard` = `light0_hard`

## トークンへの対応

| セマンティックトークン | 明るい配色 | 暗い配色 |
| --- | --- | --- |
| `--rb-color-paper` | `#fbf1c7`（light0） | `#282828`（dark0） |
| `--rb-color-surface` | `#f2e5bc`（light0_soft） | `#32302f`（dark0_soft） |
| `--rb-color-surface-hover` | `#ebdbb2`（light1） | `#3c3836`（dark1） |
| `--rb-color-ink` | `#3c3836`（dark1） | `#ebdbb2`（light1） |
| `--rb-color-muted` | `#665c54`（dark3） | `#a89984`（light4） |
| `--rb-color-accent` | `#076678`（faded_blue） | `#83a598`（bright_blue） |
| `--rb-color-border` | `#d5c4a1`（light2） | `#504945`（dark2） |
| `--rb-color-border-strong` | `#bdae93`（light3） | `#665c54`（dark3） |
| `--rb-color-danger` | `#9d0006`（faded_red） | `#fb4934`（bright_red） |
| `--rb-color-success` | `#79740e`（faded_green） | `#b8bb26`（bright_green） |
| `--rb-color-code-background` | `#f2e5bc`（light0_soft） | `#1d2021`（dark0_hard） |

コントラストの都合で、Gruvbox の色のまま別の色に置き換えた箇所があります。

- **明るい配色のリンクとアクセント** は `neutral_blue #458588` ではなく `faded_blue #076678` を使います。`#458588` は `#fbf1c7` 上で約 3.7:1 しかなく WCAG AA を満たさないためです（`#076678` は約 5.8:1）。
- **明るい配色の補助文字** は `dark4 #7c6f64` ではなく `dark3 #665c54` を使います。`#7c6f64` は約 4.3:1、`#665c54` は約 5.2:1 以上です。
- **フォーカス枠** は明るい配色で `#af3a03`、暗い配色で `#fabd2f` のオレンジ・黄系にして、どちらの紙色でも見えるようにしています。

## 変更できる項目

`gruvboxTheme(options?)` は `name` 以外の `ThemeConfig` と、テーマ固有の `contrast` を受け取ります。

| 項目 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `contrast` | `"soft" \| "medium" \| "hard"` | `"medium"` | Gruvbox のコントラスト段階（`data-gruvbox-contrast`）。紙色に `dark0_soft`/`dark0`/`dark0_hard`（明るい配色では `light0_soft`/`light0`/`light0_hard`）を選ぶ |
| `colorMode` | `"light" \| "dark" \| "system"` | `"system"` | `"light"`、`"dark"`、`"system"` |
| `typography` | `"system" \| "serif" \| "sans"` | `"system"` | 文字組みのプリセット（`data-typography`） |
| `articleLayout` | `"article" \| "sidebar" \| "full-width"` | `"article"` | 記事レイアウトの値 |
| `tokens` | `ThemeDesignTokens` | `{}` | 共通デザイントークンの上書き |
| `userCss` | `string[]` | `[]` | 追加のスタイルシート |

テーマ固有の項目は `data-gruvbox-contrast` としてルート要素に付きます。`contrast` は `attributes: { "data-gruvbox-contrast": "hard" }` として直接指定することもできます。

共通トークンの一覧は [`@riebeckite/theme-default`](../default/README_ja.md) の README を参照してください。トークン契約は同じです。

## 主なエクスポート

- `gruvboxTheme(options?)`: テーマを作成する
- `GruvboxThemeOptions`: 設定用の型
- `@riebeckite/theme-gruvbox/style.css`: テーマのスタイルシート

## 出典

Riebeckite theme based on the Gruvbox color scheme by Pavel Pertsev.

- 原典: <https://github.com/morhetz/gruvbox>
- 原典のライセンス: MIT/X11

このパッケージは Riebeckite 向けの独立したテーマであり、Gruvbox 本家そのものではありません。配布条件はパッケージの `LICENSE` ファイルに記載しています。

## 関連資料

- [テーマシステム](../../../docs/ja/docs/reference/theme-api.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
- [`@riebeckite/theme-sakura`](../sakura/README_ja.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README_ja.md)

