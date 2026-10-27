---
title: Rerurate
---
# Rerurate

[English](./rerurate.md)

## 概要

`@riebeckite/theme-rerurate` は公式テーマ **Rerurate** を提供します。テーマ ID は `rerurate` です。紙とインクを基調に、天体装飾を任意で加えられる Rerurate のテーマです。

## インストール

```sh
npm install @riebeckite/theme-rerurate
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  theme: rerurateTheme({
    colorMode: "system",
    settings: { initial: "off" },
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
| `initial` | select | 既定値 `"off"` — `off`、`small`、`medium`、`large` | 記事冒頭の頭文字の大きさを選びます。 |
| `largeHeadings` | boolean | 既定値 `false` | 記事の見出しを大きく表示します。 |
| `headingMarks` | boolean | 既定値 `true` | 見出しの横にマークを表示します。 |
| `motion` | boolean | 既定値 `true` | テーマの動きを有効にします。 |
| `stars` | boolean | 既定値 `false` | 記事ヘッダーに控えめな星空を表示します。 |
| `constellation` | boolean | 既定値 `false` | ヘッダーの星を星座のように結びます。 |
| `orbit` | boolean | 既定値 `false` | 記事ヘッダーに軌道リングを描きます。 |
| `typography` | select | 既定値 `"system"` — `system`、`serif`、`sans`、`mono` | 本文の書体を選びます。 |
| `fontSize` | slider | 既定値 `1` — 0.9375–1.25、刻み 0.0625 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.75` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |

## プリセット

このテーマにはプリセットがありません。

## CSS と属性

ルートには `data-rb-theme="rerurate"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) を参照してください。
