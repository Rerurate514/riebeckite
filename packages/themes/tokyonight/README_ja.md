# @riebeckite/theme-tokyonight

Tokyo Night の濃い藍色と鮮やかな青を使うテーマです。昼向けの明るい配色と、定番の深い夜向け配色を切り替えられます。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { tokyonightTheme } from "@riebeckite/theme-tokyonight";

export default defineConfig({
  // ...
  theme: tokyonightTheme({
    colorMode: "system",
    neon: true,
  }),
});
```

テーマ名は `tokyonight` です。明るい配色では `#e1e2e7` の背景、`#343b58` の文字、`#2e7de9` のアクセントを使います。暗い配色では `#1a1b26` の背景、`#c0caf5` の文字、`#7aa2f7` のアクセントに切り替わります。

## 変更できる項目

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `neon` | `false` | 青いフォーカス枠、選択色、スクロールバーを強調する。`data-tokyonight-neon="on"` に反映する |
| `colorMode` | `"system"` | `"light"`、`"dark"`、`"system"` |
| `typography` | `"system"` | `"system"`、`"serif"`、`"sans"` |
| `articleLayout` | `"article"` | 記事レイアウトの値 |
| `tokens` | `{}` | 共通デザイントークンの上書き |
| `userCss` | `[]` | 追加のスタイルシート |

このテーマは入力要素のアクセント色、キーボード操作時のフォーカス枠、テキスト選択、スクロールバーにも青系の色を適用します。`neon` は `attributes: { "data-tokyonight-neon": "on" }` として直接指定することもできます。

## 主なエクスポート

- `tokyonightTheme(options?)`: テーマを作成する
- `TokyonightThemeOptions`: 設定用の型
- `@riebeckite/theme-tokyonight/style.css`: テーマのスタイルシート

## 関連資料

- [テーマシステム](../../../docs/ja/theme-system.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
- [`@riebeckite/theme-sakura`](../sakura/README_ja.md)
