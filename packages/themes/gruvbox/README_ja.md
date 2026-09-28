# @riebeckite/theme-gruvbox

Gruvbox の温かい配色を使うテーマです。明るい配色ではクリーム色の背景と焦げ茶の文字、暗い配色ではチャコールの背景と淡い文字を使い、オレンジをアクセントにします。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { gruvboxTheme } from "@riebeckite/theme-gruvbox";

export default defineConfig({
  // ...
  theme: gruvboxTheme({
    colorMode: "system",
    contrast: "hard",
  }),
});
```

テーマ名は `gruvbox` です。他の Riebeckite テーマと同じ `ThemeConfig` を受け取るため、基本設定を保ったまま差し替えられます。

## 配色と見た目

明るい配色は `#fbf1c7` を背景、`#282828` を文字、`#d65d0e` をアクセントに使います。暗い配色は `#282828` を背景、`#ebdbb2` を文字、`#fe8019` をアクセントに使います。

フォームのアクセント色、キーボード操作時のフォーカス枠、テキスト選択、スクロールバーにもオレンジ系の色を適用します。デザインをより控えめにしたい場合は、`tokens` または `userCss` で上書きしてください。

## 変更できる項目

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `contrast` | `"medium"` | `"soft"`、`"medium"`、`"hard"`。背景と面の明度を調整し、`data-gruvbox-contrast` に反映する |
| `colorMode` | `"system"` | `"light"`、`"dark"`、`"system"` |
| `typography` | `"system"` | `"system"`、`"serif"`、`"sans"` |
| `articleLayout` | `"article"` | 記事レイアウトの値 |
| `tokens` | `{}` | 共通デザイントークンの上書き |
| `userCss` | `[]` | 追加のスタイルシート |

`contrast` は `attributes: { "data-gruvbox-contrast": "hard" }` として直接指定することもできます。

## 主なエクスポート

- `gruvboxTheme(options?)`: テーマを作成する
- `GruvboxThemeOptions`: 設定用の型
- `@riebeckite/theme-gruvbox/style.css`: テーマのスタイルシート

## 関連資料

- [テーマシステム](../../../docs/ja/theme-system.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
- [`@riebeckite/theme-sakura`](../sakura/README_ja.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README_ja.md)
