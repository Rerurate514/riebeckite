---
date: 2026-10-08
title: Default
---
# Default

Riebeckite の標準テーマです。色、文字組み、余白、記事レイアウトを CSS のデザイントークンとして定義します。テーマを指定しなければ、このテーマが使われます。

標準テーマは、落ち着いたニュートラルな読書面を基調にしつつ、Riebeckite Blue を操作、リンク、フォーカス、選択、アクティブ状態に絞って使います。日本語と英語の長文を読みやすく組み、コードには深みのある専用の面を与えます。情報の階層は、装飾的なカードや効果ではなく、文字組み、余白、控えめな罫線で作ります。

スタイルはテーマルートにスコープし、プラグイン内部のセレクタを直接指定しません。プラグインは公開する共通セマンティックトークンを通じてテーマの外観を受け取ります。

[English](./default.md)

## 標準テーマを明示する

通常は `config.theme` を省略して構いません。設定を明示したい場合は `defaultTheme()` を使います。

```ts
import { defineConfig } from "@riebeckite/core";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  // ...
  theme: defaultTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
  }),
});
```

このテーマの名前は `riebeckite` です。`config.theme` を省略した場合も、同じテーマが選ばれます。

## 変更できる項目

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `colorMode` | `"system"` | `"light"`、`"dark"`、`"system"`。`system` は `data-theme` がなければ OS の配色設定に従う |
| `typography` | `"system"` | `"system"`、`"serif"`、`"sans"`。`data-typography` で選択できる |
| `articleLayout` | `"article"` | `"article"`、`"sidebar"`、`"full-width"` のレイアウト値 |
| `tokens` | `{}` | 色、フォント、余白、レイアウト幅のトークンを上書きする |
| `userCss` | `[]` | 追加で読み込むスタイルシート |

`data-theme="dark"` または `data-theme="light"` をルート要素に付けると、配色モードを固定できます。

## CSS で使えるトークン

テーマは `--rb-*` 形式の CSS カスタムプロパティを定義し、`@theme` ブロックにも対応する値を渡します。そのため、通常の CSS と Tailwind 系ユーティリティのどちらからも同じトークンを利用できます。

- 色: `--rb-color-paper`、`--rb-color-ink`、`--rb-color-accent`、`--rb-color-link`、`--rb-color-focus`、`--rb-color-selected`、`--rb-color-code-background`、`--rb-color-code-ink`、`--rb-color-code-inline` など
- フォント: `--rb-font-body`、`--rb-font-heading`、`--rb-font-mono`
- 余白・形状・幅: `--rb-space-1` から `--rb-space-8`、`--rb-radius-sm`、`--rb-radius-md`、`--rb-control-*`、`--rb-motion-*`、`--rb-layout-page-max`、`--rb-layout-article-max`、`--rb-layout-sidebar`

独自テーマでもこれらの意味的なトークン名を保つと、アプリケーションとプラグインのスタイルを差し替えやすくなります。

## 主なエクスポート

- `defaultTheme(options?)`: テーマを作成する
- `DefaultThemeOptions`: 設定用の型
- `@riebeckite/theme-default/style.css`: テーマのスタイルシート

## 関連資料

- [[theme-api|テーマシステム]]
