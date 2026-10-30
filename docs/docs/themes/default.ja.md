---
date: 2026-10-01
title: Default
---
# Default

[English](./default.md)

## 概要

`@riebeckite/theme-default` は公式テーマ **Default** を提供します。テーマ ID は `riebeckite` です。ドキュメントや長文を読みやすくする、バランスの取れたテーマです。

## インストール

```sh
npm install @riebeckite/theme-default
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  theme: defaultTheme({
    colorMode: "system",
    preset: "reading",
    settings: { typography: "system" },
  }),
});
```

## 共通オプション

| プロパティ | 値 | 説明 |
| --- | --- | --- |
| `colorMode` | `"light"`、`"dark"`、`"system"` | カラーモードを選びます。`"system"` はブラウザの設定に従います。 |
| `layout` | `"article"`、`"sidebar"`、`"full-width"` | ページレイアウトを選びます。 |
| `preset` | `reading` | 明示した `settings` より先に、名前付きのテーマ設定セットを適用します。 |
| `settings` | object | 下記の設定を上書きします。不明なキーや不正な値は拒否されます。 |
| `stylesheets` | string array | テーマ CSS の後にサイト固有のスタイルシートを読み込みます。 |

設定スキーマの既定値、選択したプリセット、明示した `settings` の順に適用されます。

## テーマ設定

| プロパティ | 型 | 既定値と選択値 | 効果 |
| --- | --- | --- | --- |
| `typography` | select | 既定値 `"system"` — `system`、`serif`、`sans`、`mono` | 本文の書体を選びます。 |
| `accentColor` | color | 既定値 `"#075fc9"` | 操作要素などのアクセント色を設定します。 |
| `articleWidth` | slider | 既定値 `46` — 36–56、刻み 1 | 本文の最大幅を rem で設定します。 |
| `fontSize` | slider | 既定値 `1.0625` — 0.9375–1.25、刻み 0.0625 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.8` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |

## プリセット

| プリセット | ラベル | 適用する設定 |
| --- | --- | --- |
| `reading` | Reading | `{ typography: "serif", articleWidth: 44 }` |

## CSS と属性

ルートには `data-rb-theme="riebeckite"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) を参照してください。
