---
date: 2026-10-01
title: Gruvbox
---
# Gruvbox

[English](./gruvbox.md)

## 概要

`@riebeckite/theme-gruvbox` は公式テーマ **Gruvbox** を提供します。テーマ ID は `gruvbox` です。Gruvbox パレットを基調にした、暖色系でコントラストの高いテーマです。

## 実際の表示例

**ライト**

![[theme-gruvbox-light.png]]

**ダーク**

![[theme-gruvbox-dark.png]]

## インストール

```sh
npm install @riebeckite/theme-gruvbox
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { gruvboxTheme } from "@riebeckite/theme-gruvbox";

export default defineConfig({
  theme: gruvboxTheme({
    colorMode: "system",
    settings: { contrast: "medium" },
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
| `contrast` | select | 既定値 `"medium"` — `soft`、`medium`、`hard` | Gruvbox のコントラストを選びます。 |
| `typography` | select | 既定値 `"system"` — `system`、`serif`、`sans`、`mono` | 本文の書体を選びます。 |
| `accentColor` | color | 既定値 `"#076678"` | 操作要素などのアクセント色を設定します。 |
| `articleWidth` | slider | 既定値 `48` — 36–64、刻み 1 | 本文の最大幅を rem で設定します。 |
| `fontSize` | slider | 既定値 `1.0625` — 0.9375–1.25、刻み 0.0625 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.75` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |
| `scanlines` | boolean | 既定値 `false` | 控えめな CRT の走査線を表示します。 |

## プリセット

このテーマにはプリセットがありません。

## CSS と属性

ルートには `data-rb-theme="gruvbox"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) を参照してください。
