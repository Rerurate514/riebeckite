# @riebeckite/theme-module

<!-- Generated from docs/docs/themes/module.ja.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

[English](./README.md)

## 概要

`@riebeckite/theme-module` は公式テーマ **Module** を提供します。テーマ ID は `module` です。グリッドとエッジのディテールを備えた、構造的な技術テーマです。

## インストール

```sh
npm install @riebeckite/theme-module
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { moduleTheme } from "@riebeckite/theme-module";

export default defineConfig({
  theme: moduleTheme({
    colorMode: "system",
    settings: { typography: "system" },
  }),
});
```

## 共通オプション

| プロパティ | 値 | 説明 |
| --- | --- | --- |
| `colorMode` | `"light"`、`"dark"`、`"system"` | カラーモードを選びます。`"system"` はブラウザの設定に従います。 |
| `layout` | `"article"`、`"sidebar"`、`"full-width"` | ページレイアウトを選びます。 |
| `preset` | — | このテーマにはプリセットがありません。 |
| `settings` | object | 下記の設定を上書きします。不明なキーや不正な値は拒否されます。 |
| `stylesheets` | string array | テーマ CSS の後にサイト固有のスタイルシートを読み込みます。 |

設定スキーマの既定値、選択したプリセット、明示した `settings` の順に適用されます。

## テーマ設定

| プロパティ | 型 | 既定値と選択値 | 効果 |
| --- | --- | --- | --- |
| `typography` | select | 既定値 `"system"` — `system`、`serif`、`sans`、`mono` | 本文の書体を選びます。 |
| `accentColor` | color | 既定値 `"#a94e08"` | 操作要素などのアクセント色を設定します。 |
| `articleWidth` | slider | 既定値 `50` — 40–68、刻み 1 | 本文の最大幅を rem で設定します。 |
| `fontSize` | slider | 既定値 `1` — 0.9375–1.25、刻み 0.0625 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.75` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |
| `blueprint` | boolean | 既定値 `true` | 読書面の背景にグリッドを表示します。 |
| `glow` | boolean | 既定値 `true` | テーマのディテールに発光効果を加えます。 |
| `flourish` | boolean | 既定値 `false` | 記事ヘッダーに控えめな装飾を表示します。 |

## プリセット

このテーマにはプリセットがありません。

## CSS と属性

ルートには `data-rb-theme="module"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md) と [テーマを書く](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.ja.md) を参照してください。
