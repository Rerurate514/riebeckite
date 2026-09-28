# @riebeckite/theme-rerurate

Paper、Ink、Orange を軸にした Rerurate のテーマです。フラットな面、1px の罫線、8px を基準にした余白で、情報の境界をはっきり見せます。

[English](./README_en.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  // ...
  theme: rerurateTheme({
    colorMode: "system",
    initial: true,
  }),
});
```

テーマ名は `rerurate` です。明るい配色では `#f6efe2` の Paper と `#171717` の Ink、暗い配色では `#1c1a17` の背景と Paper 系の文字を使います。アクセントの Orange はどちらも `#f66620` です。

## このテーマ固有の見た目

影、ぼかし、ガラス調の表現は使いません。代わりに `--rb-rule-width: 1px` の罫線、Orange のフォーカス枠、Paper と Orange の選択色で要素の関係を示します。`--rb-space-*` は 8px 基準です。

加えて、デザイン層向けに `--rr-color-paper`、`--rr-color-ink`、`--rr-color-orange`、`--rr-space-1` から `--rr-space-4`、`--rr-rule-width` を公開します。意味のある色として Red と Green が必要な場面では、共通の `danger` と `success` トークンを使います。

## 変更できる項目

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `initial` | `false` | 記事本文の最初の文字を Orange の大きな頭文字にする。`data-rerurate-initial="on"` に反映する |
| `colorMode` | `"system"` | `"light"`、`"dark"`、`"system"` |
| `typography` | `"system"` | `"system"`、`"serif"`、`"sans"` |
| `articleLayout` | `"article"` | 記事レイアウトの値 |
| `tokens` | `{}` | 共通デザイントークンの上書き |
| `userCss` | `[]` | 追加のスタイルシート |

頭文字の装飾は本文の冒頭にだけ使われます。すべての記事で必要とは限らないため、`initial` は既定で無効です。属性を直接指定する場合は `attributes: { "data-rerurate-initial": "on" }` を使えます。

## 主なエクスポート

- `rerurateTheme(options?)`: テーマを作成する
- `RerurateThemeOptions`: 設定用の型
- `@riebeckite/theme-rerurate/style.css`: テーマのスタイルシート

## 関連資料

- [テーマシステム](../../../docs/ja/theme-system.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
- [`@riebeckite/theme-sakura`](../sakura/README_ja.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README_ja.md)
- [`@riebeckite/theme-gruvbox`](../gruvbox/README_ja.md)
