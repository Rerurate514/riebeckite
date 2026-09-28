# @riebeckite/theme-minimal

色と基本トークンだけを提供する、もっとも小さな Riebeckite テーマです。装飾的なベーススタイルを持たないため、自作テーマの出発点やテーマ実装の参照に向いています。

[English](./README.md)

## 何をするテーマか

`minimalTheme()` は名前が `minimal` のテーマを作ります。完全な `--rb-*` トークンと `@theme` の対応は持ちますが、トークン値以外の見た目には手を加えません。テーマ固有の `data-*` 属性や、`html`、`body`、`::selection`、`:focus-visible` への追加ルールもありません。

独自 CSS の影響を見極めたいときや、独自テーマを小さく始めたいときに選んでください。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  // ...
  theme: minimalTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
  }),
});
```

## 変更できる項目

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `colorMode` | `"system"` | `"light"`、`"dark"`、`"system"` |
| `typography` | `"system"` | `"system"`、`"serif"`、`"sans"` |
| `articleLayout` | `"article"` | 記事レイアウトの値 |
| `tokens` | `{}` | 色、フォント、余白、レイアウト幅のトークンを上書きする |
| `userCss` | `[]` | 追加のスタイルシート |

トークンの意味と一覧は [`@riebeckite/theme-default`](../default/README_ja.md) を参照してください。

## 主なエクスポート

- `minimalTheme(options?)`: テーマを作成する
- `MinimalThemeOptions`: 設定用の型
- `@riebeckite/theme-minimal/style.css`: テーマのスタイルシート

## 関連資料

- [テーマシステム](../../../docs/ja/theme-system.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
- [`@riebeckite/theme-sakura`](../sakura/README_ja.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README_ja.md)
- [`@riebeckite/theme-gruvbox`](../gruvbox/README_ja.md)
- [`@riebeckite/theme-rerurate`](../rerurate/README_ja.md)
