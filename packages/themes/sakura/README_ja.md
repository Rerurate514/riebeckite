# @riebeckite/theme-sakura

<!-- Generated from docs/docs/themes/sakura.ja.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

[English](./README.md)

## 概要

`@riebeckite/theme-sakura` は公式テーマ **Sakura** を提供します。テーマ ID は `sakura` です。桜の装飾を備えた、やわらかな和風テーマです。

## インストール

```sh
npm install @riebeckite/theme-sakura
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  theme: sakuraTheme({
    colorMode: "system",
    settings: { bloom: "soft" },
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
| `bloom` | select | 既定値 `"soft"` — `soft`、`vivid` | 桜色の鮮やかさを選びます。 |
| `roundness` | select | 既定値 `"soft"` — `soft`、`crisp` | テーマのディテールの丸みを選びます。 |
| `heading` | select | 既定値 `"decorated"` — `decorated`、`plain` | 見出しの表示スタイルを選びます。 |
| `typography` | select | 既定値 `"system"` — `system`、`serif`、`sans`、`mono` | 本文の書体を選びます。 |
| `articleWidth` | slider | 既定値 `46` — 34–60、刻み 1 | 本文の最大幅を rem で設定します。 |
| `fontSize` | slider | 既定値 `1.0625` — 0.9375–1.25、刻み 0.0625 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.9` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |
| `petals` | boolean | 既定値 `false` | 記事ヘッダーに花びらを舞わせます。 |

## プリセット

このテーマにはプリセットがありません。

## CSS と属性

ルートには `data-rb-theme="sakura"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md) と [テーマを書く](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.ja.md) を参照してください。
