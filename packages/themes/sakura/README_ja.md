# @riebeckite/theme-sakura

桜を思わせる淡い背景と深いプラム色の文字を使うテーマです。明暗どちらの配色でも、ピンクをアクセントとして使います。

[English](./README_en.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  // ...
  theme: sakuraTheme({
    colorMode: "system",
    bloom: "vivid",
  }),
});
```

テーマ名は `sakura` です。明るい配色では `#fff8fa` の背景、`#4a2a3a` の文字、`#e8789f` のアクセントを使います。暗い配色では背景を `#241520`、文字を `#f9e4ec`、アクセントを `#f4a3c2` に切り替えます。

## 変更できる項目

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `bloom` | `"soft"` | `"soft"` または `"vivid"`。`vivid` はより強いピンクを使い、`data-sakura-bloom` に反映する |
| `colorMode` | `"system"` | `"light"`、`"dark"`、`"system"` |
| `typography` | `"system"` | `"system"`、`"serif"`、`"sans"` |
| `articleLayout` | `"article"` | 記事レイアウトの値 |
| `tokens` | `{}` | 共通デザイントークンの上書き |
| `userCss` | `[]` | 追加のスタイルシート |

`bloom` は `attributes: { "data-sakura-bloom": "vivid" }` として直接指定することもできます。ほかのテーマと同じトークンなので、アプリケーション側の CSS を大きく変えずに切り替えられます。

## 主なエクスポート

- `sakuraTheme(options?)`: テーマを作成する
- `SakuraThemeOptions`: 設定用の型
- `@riebeckite/theme-sakura/style.css`: テーマのスタイルシート

## 関連資料

- [テーマシステム](../../../docs/ja/theme-system.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
