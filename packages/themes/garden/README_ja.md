# @riebeckite/theme-garden

<!-- Generated from docs/docs/themes/garden.ja.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

[English](./README.md)

## 概要

`@riebeckite/theme-garden` は公式テーマ **Garden** を提供します。テーマ ID は `garden` です。季節の植物装飾を備えた、穏やかな読書向けテーマです。

## インストール

```sh
npm install @riebeckite/theme-garden
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { gardenTheme } from "@riebeckite/theme-garden";

export default defineConfig({
  theme: gardenTheme({
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
| `accentColor` | color | 既定値 `"#526b38"` | 操作要素などのアクセント色を設定します。 |
| `articleWidth` | slider | 既定値 `46` — 34–60、刻み 1 | 本文の最大幅を rem で設定します。 |
| `fontSize` | slider | 既定値 `1.0625` — 0.9375–1.25、刻み 0.0625 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.9` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |
| `motion` | boolean | 既定値 `true` | テーマの動きを有効にします。 |
| `sprigs` | boolean | 既定値 `true` | 見出しに植物の装飾を表示します。 |
| `season` | select | 既定値 `"spring"` — `spring`、`summer`、`autumn`、`winter` | 植物装飾の季節パレットを選びます。 |

## プリセット

このテーマにはプリセットがありません。

## CSS と属性

ルートには `data-rb-theme="garden"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md) と [テーマを書く](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.ja.md) を参照してください。
