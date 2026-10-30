---
date: 2026-10-25
title: Technical
---
# Technical

[English](./technical.md)

## 概要

`@riebeckite/theme-technical` は公式テーマ **Technical** を提供します。テーマ ID は `technical` です。技術文書向けの、設計図を思わせるテーマです。

## 実際の表示例

**ライト**

![[theme-technical-light.png]]

**ダーク**

![[theme-technical-dark.png]]

## インストール

```sh
npm install @riebeckite/theme-technical
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { technicalTheme } from "@riebeckite/theme-technical";

export default defineConfig({
  theme: technicalTheme({
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
| `accentColor` | color | 既定値 `"#1766b1"` | 操作要素などのアクセント色を設定します。 |
| `articleWidth` | slider | 既定値 `52` — 40–68、刻み 1 | 本文の最大幅を rem で設定します。 |
| `fontSize` | slider | 既定値 `1` — 0.9375–1.25、刻み 0.0625 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.75` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |
| `ornaments` | boolean | 既定値 `true` | 技術的なヘッダー装飾を表示します。 |
| `terminal` | boolean | 既定値 `false` | 本文を等幅フォントで表示します。 |

## プリセット

このテーマにはプリセットがありません。

## CSS と属性

ルートには `data-rb-theme="technical"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) を参照してください。
