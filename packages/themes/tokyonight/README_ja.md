# @riebeckite/theme-tokyonight

Tokyo Night の濃い藍色と鮮やかな青を、開発ツールらしい見た目に寄せたテーマです。等幅の見出し、詰まった行間、角を立てた1px罫線の面、青いアクセント、任意のネオン発光で構成します。昼向けの明るい配色と、定番の深い夜向け配色を切り替えられます。

[English](./README.md)

## 特長

単なる配色の差し替えではなく、次のような見た目の性格を持たせています。

- **等幅・大文字の見出し** — JetBrains Mono を使い、字間を広げ、アクセントの縦罫を添える
- **角と罫線** — 面の角は直角、境界は1pxの罫線、影は使わない
- **コード** — 等幅、1px罫線、アクセントの左罫、余白を広めにとったヘッダー風の体裁
- **任意のネオン** — フォーカス枠、選択色、スクロールバー、リンクのホバー、見出しのアクセントに控えめな発光を足す

本文はサンセリフのまま、日本語のグリフはシステムフォントにフォールバックします。ラテン文字には同梱の JetBrains Mono を使います。

明るい配色では `#e1e2e7` の背景、`#343b58` の文字、`#2e7de9` のアクセントを使います。暗い配色では `#1a1b26` の背景、`#c0caf5` の文字、`#7aa2f7` のアクセントに切り替わります。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { tokyonightTheme } from "@riebeckite/theme-tokyonight";

export default defineConfig({
  // ...
  theme: tokyonightTheme({
    colorMode: "system",
    density: "cozy",
    heading: "tech",
    neon: true,
  }),
});
```

テーマ名は `tokyonight` です。

## 変更できる項目

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `density` | `"cozy"` | 行間と余白。`"compact"` にすると `--rb-space-*` と見出し・段落・リストの間隔を詰める（`data-tokyonight-density`） |
| `heading` | `"tech"` | 見出しの体裁。`"tech"` は等幅・大文字でアクセントの罫を添え、`"plain"` は大文字化と装飾を外して本文フォントに戻す（`data-tokyonight-heading`） |
| `neon` | `false` | 青いフォーカス枠、選択色、スクロールバー、リンクのホバー、見出しのアクセントを強調する（`data-tokyonight-neon="on"`） |
| `colorMode` | `"system"` | `"light"`、`"dark"`、`"system"` |
| `typography` | `"system"` | `"system"`、`"serif"`、`"sans"` |
| `articleLayout` | `"article"` | 記事レイアウトの値 |
| `tokens` | `{}` | 共通デザイントークンの上書き |
| `userCss` | `[]` | 追加のスタイルシート |

このテーマは入力要素のアクセント色、キーボード操作時のフォーカス枠、テキスト選択、スクロールバーにも青系の色を適用します。テーマ固有の項目は `data-tokyonight-density`、`data-tokyonight-heading`、`data-tokyonight-neon` としてルート要素に付きます。`neon` は `attributes: { "data-tokyonight-neon": "on" }` として直接指定することもできます。

## フォント

JetBrains Mono のラテン文字サブセットを同梱しているため、外部へのリクエストは発生しません。ライセンスは SIL Open Font License で、`styles/fonts/jetbrains-mono-LICENSE.txt` に収録しています。等幅テキストと、`heading: "tech"` のときの見出しに使い、日本語のグリフはシステムフォントにフォールバックします。

## 主なエクスポート

- `tokyonightTheme(options?)`: テーマを作成する
- `TokyonightThemeOptions`: 設定用の型
- `@riebeckite/theme-tokyonight/style.css`: テーマのスタイルシート

## 関連資料

- [テーマシステム](../../../docs/ja/reference/theme-api.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
- [`@riebeckite/theme-sakura`](../sakura/README_ja.md)
