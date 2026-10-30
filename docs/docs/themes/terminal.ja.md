---
date: 2026-10-27
title: Terminal
---
# Terminal

[English](./terminal.md)

## 概要

`@riebeckite/theme-terminal` は公式テーマ **Terminal** を提供します。テーマ ID は `terminal` です。蛍光体色やフレームを設定できる、ターミナル風テーマです。

## インストール

```sh
npm install @riebeckite/theme-terminal
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { terminalTheme } from "@riebeckite/theme-terminal";

export default defineConfig({
  theme: terminalTheme({
    colorMode: "system",
    preset: "classic",
    settings: { typography: "mono" },
  }),
});
```

## 共通オプション

| プロパティ | 値 | 説明 |
| --- | --- | --- |
| `colorMode` | `"light"`、`"dark"`、`"system"` | カラーモードを選びます。`"system"` はブラウザの設定に従います。 |
| `layout` | `"article"`、`"sidebar"`、`"full-width"` | ページレイアウトを選びます。 |
| `preset` | `classic`、`amber`、`modern` | 明示した `settings` より先に、名前付きのテーマ設定セットを適用します。 |
| `settings` | object | 下記の設定を上書きします。不明なキーや不正な値は拒否されます。 |
| `stylesheets` | string array | テーマ CSS の後にサイト固有のスタイルシートを読み込みます。 |

設定スキーマの既定値、選択したプリセット、明示した `settings` の順に適用されます。

## テーマ設定

| プロパティ | 型 | 既定値と選択値 | 効果 |
| --- | --- | --- | --- |
| `typography` | select | 既定値 `"mono"` — `mono`、`system`、`serif`、`sans` | 本文の書体を選びます。 |
| `fontSize` | slider | 既定値 `0.95` — 0.85–1.25、刻み 0.05 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.75` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |
| `phosphor` | select | 既定値 `"green"` — `green`、`amber`、`white`、`ice` | 端末の蛍光体色を選びます。 |
| `scanlines` | boolean | 既定値 `false` | 控えめな CRT の走査線を表示します。 |
| `glow` | boolean | 既定値 `false` | テーマのディテールに発光効果を加えます。 |
| `frameStyle` | select | 既定値 `"line"` — `none`、`line`、`window` | 端末フレームのスタイルを選びます。 |
| `cursor` | boolean | 既定値 `true` | 端末カーソルを表示します。 |

## プリセット

| プリセット | ラベル | 適用する設定 |
| --- | --- | --- |
| `classic` | Classic | `{ phosphor: "green", frameStyle: "line", cursor: true }` |
| `amber` | Amber | `{ phosphor: "amber", glow: true, frameStyle: "window" }` |
| `modern` | Modern | `{ phosphor: "ice", frameStyle: "none", cursor: false }` |

## CSS と属性

ルートには `data-rb-theme="terminal"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) を参照してください。
