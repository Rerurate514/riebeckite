---
date: 2026-10-25
title: Editorial
---
# Editorial

[English](./editorial.md)

## 概要

`@riebeckite/theme-editorial` は公式テーマ **Editorial** を提供します。テーマ ID は `editorial` です。タイポグラフィと記事装飾を備えた、出版物風のテーマです。

## インストール

```sh
npm install @riebeckite/theme-editorial
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { editorialTheme } from "@riebeckite/theme-editorial";

export default defineConfig({
  theme: editorialTheme({
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
| `accentColor` | color | 既定値 `"#8a2738"` | 操作要素などのアクセント色を設定します。 |
| `articleWidth` | slider | 既定値 `48` — 36–64、刻み 1 | 本文の最大幅を rem で設定します。 |
| `fontSize` | slider | 既定値 `1.125` — 0.9375–1.25、刻み 0.0625 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.9` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |
| `motion` | boolean | 既定値 `true` | テーマの動きを有効にします。 |
| `dropCap` | boolean | 既定値 `false` | 記事冒頭の一文字を大きく表示します。 |
| `ornament` | boolean | 既定値 `true` | 記事ヘッダーの装飾を表示します。 |

## プリセット

このテーマにはプリセットがありません。

## CSS と属性

ルートには `data-rb-theme="editorial"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) を参照してください。
