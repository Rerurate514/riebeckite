---
date: 2026-10-27
title: Fieldnotes
---
# Fieldnotes

[English](./fieldnotes.md)

## 概要

`@riebeckite/theme-fieldnotes` は公式テーマ **Fieldnotes** を提供します。テーマ ID は `fieldnotes` です。紙面や注釈の表現を備えた、ノートブック風のテーマです。

## 実際の表示例

**ライト**

![[theme-fieldnotes-light.png]]

**ダーク**

![[theme-fieldnotes-dark.png]]

## インストール

```sh
npm install @riebeckite/theme-fieldnotes
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { fieldnotesTheme } from "@riebeckite/theme-fieldnotes";

export default defineConfig({
  theme: fieldnotesTheme({
    colorMode: "system",
    preset: "journal",
    settings: { typography: "system" },
  }),
});
```

## 共通オプション

| プロパティ | 値 | 説明 |
| --- | --- | --- |
| `colorMode` | `"light"`、`"dark"`、`"system"` | カラーモードを選びます。`"system"` はブラウザの設定に従います。 |
| `layout` | `"article"`、`"sidebar"`、`"full-width"` | ページレイアウトを選びます。 |
| `preset` | `journal`、`laboratory`、`archive` | 明示した `settings` より先に、名前付きのテーマ設定セットを適用します。 |
| `settings` | object | 下記の設定を上書きします。不明なキーや不正な値は拒否されます。 |
| `stylesheets` | string array | テーマ CSS の後にサイト固有のスタイルシートを読み込みます。 |

設定スキーマの既定値、選択したプリセット、明示した `settings` の順に適用されます。

## テーマ設定

| プロパティ | 型 | 既定値と選択値 | 効果 |
| --- | --- | --- | --- |
| `typography` | select | 既定値 `"system"` — `system`、`serif`、`sans`、`mono` | 本文の書体を選びます。 |
| `fontSize` | slider | 既定値 `1.05` — 0.95–1.25、刻み 0.05 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.8` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |
| `paperStyle` | select | 既定値 `"ruled"` — `plain`、`grid`、`ruled`、`dotted` | 紙面の背景パターンを選びます。 |
| `inkColor` | color | 既定値 `"#304a62"` | 本文や注釈の主な色を設定します。 |
| `marginRule` | boolean | 既定値 `true` | ノートのマージン罫線を表示します。 |
| `indexMarks` | boolean | 既定値 `true` | ノートのインデックスマークを表示します。 |
| `texture` | boolean | 既定値 `true` | 紙の質感を表示します。 |

## プリセット

| プリセット | ラベル | 適用する設定 |
| --- | --- | --- |
| `journal` | Journal | `{ paperStyle: "ruled", marginRule: true }` |
| `laboratory` | Laboratory | `{ paperStyle: "grid", indexMarks: true }` |
| `archive` | Archive | `{ paperStyle: "plain", texture: false, marginRule: false }` |

## CSS と属性

ルートには `data-rb-theme="fieldnotes"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) を参照してください。
