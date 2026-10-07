# @riebeckite/theme-sakura

桜を思わせる淡い背景と深いプラム色の文字に、やわらかなセリフ体の本文を組み合わせたテーマです。角丸のやさしい面と控えめな桜のアクセントで、明暗どちらの配色でも落ち着いて読める誌面をつくります。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  // ...
  theme: sakuraTheme({
    colorMode: "system",
    bloom: "vivid",
    roundness: "soft",
    heading: "decorated",
  }),
});
```

テーマ名は `sakura` です。明るい配色では `#fff8fa` の背景、`#4a2a3a` の文字、`#e8789f` のアクセントを使います。暗い配色では背景を `#241520`、文字を `#f9e4ec`、アクセントを `#f4a3c2` に切り替えます。

色だけでなく、誌面そのものに次のような性格を持たせています。

- **セリフ体の本文と見出し** — 欧文はセルフホストの可変フォント Source Serif 4、和文はシステムの明朝体（`Hiragino Mincho ProN`、`Yu Mincho`、`Noto Serif JP`）にフォールバックします。行間は 1.9 でゆったりと組みます。
- **角丸の静かな面** — コードブロック、コールアウト、表、引用、カードは `roundness` に応じた角丸にします。影は画像など、本当に浮かせたい要素だけに控えめに使います。
- **桜のアクセント** — リンク、リストのマーカー、引用のライン、コールアウト、`h2` の下の短い罫線などにアクセント色を効かせます。読みやすさを損なわない範囲に留めています。
- **見出しの飾り** — `heading` で `h2` の飾り罫を出し分けられます。

## 変更できる項目

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `bloom` | `"soft"` | `"soft"` または `"vivid"`。`vivid` はより強いピンクを使い、`data-sakura-bloom` に反映する |
| `roundness` | `"soft"` | `"soft"` または `"crisp"`。面の角丸の大きさを切り替え、`data-sakura-roundness` に反映する |
| `heading` | `"decorated"` | `"decorated"` または `"plain"`。`h2` の飾り罫を出し分け、`data-sakura-heading` に反映する |
| `colorMode` | `"system"` | `"light"`、`"dark"`、`"system"` |
| `typography` | `"system"` | `"system"`、`"serif"`、`"sans"`。既定はセリフ体で、`sans` を選ぶと本文がサンセリフ体に戻る |
| `articleLayout` | `"article"` | 記事レイアウトの値 |
| `tokens` | `{}` | 共通デザイントークンの上書き |
| `userCss` | `[]` | 追加のスタイルシート |

各オプションは `attributes: { "data-sakura-roundness": "crisp" }` のように直接指定することもできます。ほかのテーマと同じトークンなので、アプリケーション側の CSS を大きく変えずに切り替えられます。

## フォント

欧文用の [Source Serif 4](https://github.com/adobe-fonts/source-serif) は `styles/fonts/source-serif-4-latin-wght-normal.woff2` に同梱しています。`font-display: swap` と欧文レンジの `unicode-range` を指定して読み込みます。和文の字形は含まれないため、`Hiragino Mincho ProN`、`Yu Mincho`、`Noto Serif JP` へ順にフォールバックします。ライセンスは SIL Open Font License 1.1（`styles/fonts/source-serif-4-LICENSE.txt`）で、セルフホストのため外部へのリクエストは発生しません。

## 主なエクスポート

- `sakuraTheme(options?)`: テーマを作成する
- `SakuraThemeOptions`: 設定用の型
- `@riebeckite/theme-sakura/style.css`: テーマのスタイルシート

## 関連資料

- [テーマシステム](../../../docs/docs/reference/theme-api.ja.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)

