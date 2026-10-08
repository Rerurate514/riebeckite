# @riebeckite/theme-rerurate

<!-- Generated from docs/docs/themes/rerurate.ja.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

Paper、Ink、Orange を軸にした Rerurate のテーマです。フラットな面、1px の罫線、8px を基準にした余白で、情報の境界をはっきり見せます。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  // ...
  theme: rerurateTheme({
    colorMode: "system",
    initial: "large",
    motion: true,
  }),
});
```

テーマ名は `rerurate` です。明るい配色では `#f6efe2` の Paper と `#171717` の Ink、暗い配色では `#1c1a17` の背景と Paper 系の文字を使います。アクセントの Orange はどちらも `#f66620` です。

## このテーマ固有の見た目

影、ぼかし、ガラス調の表現は使いません。代わりに `--rb-rule-width: 1px` の罫線、Orange のフォーカス枠、Paper と Orange の選択色で要素の関係を示します。`--rb-space-*` は 8px 基準です。

組版はグラフィックとして扱います。見出しはサイズ・太さ・余白で階層をつくり、本文は読みやすい大きさのままにします。メタデータは字間を広げた ALL CAPS の英字で、頭に短い Orange の罫線を添えます。記事タイトルは Ink ではなく Orange で表示します。見出しは既定では控えめな大きさで、`largeHeadings` を有効にすると少しだけ大きくなります。

既定では Markdown 風の `#` を h1〜h5 の見出しの先頭にインラインで添えます。h1 は `#`、h2 は `##` というように階層に合わせて増え、h6 には付けません。見出しの文字は `#` の分だけ右にずれ、最初から `## 見出し` と書いたような見た目になります。`#` は見出しと同じサイズ・色・フォントを使います。`headingMarks` で外せます。

コールアウトはフラットな面のまま、1px の枠と Orange の左罫線で示し、タイトルは字間を広げた ALL CAPS にします。

もうひとつの軸が多色の罫線モチーフです。濃い赤・黄・落ち着いた Green の三つを均等に並べた細い罫線で、グラデーションの代わりに使います。Orange はこのモチーフには使いません。記事ヘッダーと h2 のアクセントに現れ、補助パレットはこの細い区間にだけ使います。

読み込み時には 460ms ほどのアニメーションで、ヘッダーの罫線を引き、タイトルをわずかに上げ、その罫線を幾何学図形へつなげます。スクロールに連動する出現は使いません。罫線モチーフ、ベクターのマーク、引用の山形記号は CSS に埋め込んだ `data:` URI の SVG なので、マークアップは増えず、アニメーションを止めても図として成立します。

さらに、デザイン層向けに `--rr-color-*`、`--rr-space-1` から `--rr-space-4`、`--rr-rule-width` に加えて、モーションと SVG のトークンも公開します。意味のある色として Red と Green が必要な場面では、共通の `danger` と `success` トークンを使います。

## 変更できる項目

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `initial` | `false` | 記事本文の最初の文字を Orange の頭文字にする。`true` は `"medium"` 相当。`"small"`、`"medium"`、`"large"` で大きさを選べる。`data-rerurate-initial="on"` と `data-rerurate-initial-size` に反映する |
| `largeHeadings` | `false` | 見出しを少しだけ大きくする。`true` で `data-rerurate-headings="large"` を付ける |
| `headingMarks` | `true` | h1〜h5 の見出しの先頭に Markdown 風の `#`〜`#####` をインラインで添える（見出しと同じサイズ・色・フォント。h6 には付けない）。`false` で `data-rerurate-heading-marks="off"` を付けて外す |
| `motion` | `true` | 読み込み時のアニメーション（罫線の描画、タイトルの上昇、罫線から図形への変化）を再生する。`false` は `data-rerurate-motion="off"` を付け、完成した状態をそのまま表示する。`prefers-reduced-motion` が有効な環境でも再生しない |
| `colorMode` | `"system"` | `"light"`、`"dark"`、`"system"` |
| `typography` | `"system"` | `"system"`、`"serif"`、`"sans"` |
| `articleLayout` | `"article"` | 記事レイアウトの値 |
| `tokens` | `{}` | 共通デザイントークンの上書き |
| `userCss` | `[]` | 追加のスタイルシート |

頭文字の装飾は本文の冒頭にだけ使われます。すべての記事で必要とは限らないため、`initial` は既定で無効です。属性を直接指定する場合は、`attributes: { "data-rerurate-initial": "on", "data-rerurate-motion": "off" }` のように `data-rerurate-initial`、`data-rerurate-headings`、`data-rerurate-heading-marks`、`data-rerurate-motion` を組み合わせて使えます。

## 主なエクスポート

- `rerurateTheme(options?)`: テーマを作成する
- `RerurateThemeOptions`: 設定用の型
- `@riebeckite/theme-rerurate/style.css`: テーマのスタイルシート

## 関連資料

- [テーマシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.ja.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
- [`@riebeckite/theme-sakura`](../sakura/README_ja.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README_ja.md)
- [`@riebeckite/theme-gruvbox`](../gruvbox/README_ja.md)

## Documentation site

Rerurate の視覚表現をもとにした Theme です。

## 導入

```bash
npm install @riebeckite/theme-rerurate
```

Theme の factory 名と設定項目は、実装とこの正本ページを一次情報として確認してください。`riebeckite.config.ts` の `theme` に設定して利用します。

## 詳細仕様

設定項目や Theme 固有の仕様は この正本ページを参照してください。Theme の仕組みは [Theme System](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/framework/theme-system.ja.md)、Theme を作る場合は [Writing a Theme](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.ja.md) を参照してください。
