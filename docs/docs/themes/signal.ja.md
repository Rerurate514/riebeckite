---
date: 2026-10-27
title: Signal
---
# Signal

[English](./signal.md)

## 概要

`@riebeckite/theme-signal` は公式テーマ **Signal** を提供します。テーマ ID は `signal` です。エディトリアルやポスター風の表現に向く、大胆なグラフィックテーマです。

## インストール

```sh
npm install @riebeckite/theme-signal
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { signalTheme } from "@riebeckite/theme-signal";

export default defineConfig({
  theme: signalTheme({
    colorMode: "system",
    preset: "poster",
    settings: { accentColor: "#e63b17" },
  }),
});
```

## 共通オプション

| プロパティ | 値 | 説明 |
| --- | --- | --- |
| `colorMode` | `"light"`、`"dark"`、`"system"` | カラーモードを選びます。`"system"` はブラウザの設定に従います。 |
| `layout` | `"article"`、`"sidebar"`、`"full-width"` | ページレイアウトを選びます。 |
| `preset` | `poster`、`editorial`、`reading` | 明示した `settings` より先に、名前付きのテーマ設定セットを適用します。 |
| `settings` | object | 下記の設定を上書きします。不明なキーや不正な値は拒否されます。 |
| `stylesheets` | string array | テーマ CSS の後にサイト固有のスタイルシートを読み込みます。 |

設定スキーマの既定値、選択したプリセット、明示した `settings` の順に適用されます。

## テーマ設定

| プロパティ | 型 | 既定値と選択値 | 効果 |
| --- | --- | --- | --- |
| `accentColor` | color | 既定値 `"#e63b17"` | 操作要素などのアクセント色を設定します。 |
| `borderWeight` | select | 既定値 `"bold"` — `standard`、`bold` | 構造的な罫線の太さを選びます。 |
| `typography` | select | 既定値 `"grotesk"` — `grotesk`、`system`、`serif`、`mono` | 本文の書体を選びます。 |
| `density` | select | 既定値 `"editorial"` — `poster`、`editorial`、`reading` | 読書面の密度を選びます。 |
| `fontSize` | slider | 既定値 `1.04` — 0.94–1.24、刻み 0.01 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.65` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |
| `markers` | boolean | 既定値 `true` | 幾何学的なセクションマーカーを表示します。 |

## プリセット

| プリセット | ラベル | 適用する設定 |
| --- | --- | --- |
| `poster` | Poster | `{ density: "poster", borderWeight: "bold" }` |
| `editorial` | Editorial | `{ density: "editorial" }` |
| `reading` | Reading | `{ density: "reading", typography: "serif", borderWeight: "standard" }` |

## CSS と属性

ルートには `data-rb-theme="signal"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) を参照してください。
