---
date: 2026-10-25
title: Folio
---
# Folio

[English](./folio.md)

## 概要

`@riebeckite/theme-folio` は公式テーマ **Folio** を提供します。テーマ ID は `folio` です。エディトリアルな枠組みを持つ、余白の広いポートフォリオ風テーマです。

## 実際の表示例

**ライト**

![[theme-folio-light.png]]

**ダーク**

![[theme-folio-dark.png]]

## インストール

```sh
npm install @riebeckite/theme-folio
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { folioTheme } from "@riebeckite/theme-folio";

export default defineConfig({
  theme: folioTheme({
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
| `accentColor` | color | 既定値 `"#d6422c"` | 操作要素などのアクセント色を設定します。 |
| `articleWidth` | slider | 既定値 `62` — 44–76、刻み 1 | 本文の最大幅を rem で設定します。 |
| `fontSize` | slider | 既定値 `1.05` — 0.95–1.25、刻み 0.05 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.65` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |
| `motion` | boolean | 既定値 `true` | テーマの動きを有効にします。 |
| `ornament` | boolean | 既定値 `true` | 記事ヘッダーの装飾を表示します。 |
| `seal` | boolean | 既定値 `false` | 記事ヘッダーに円形のフォリオ印を追加します。 |

## プリセット

このテーマにはプリセットがありません。

## CSS と属性

ルートには `data-rb-theme="folio"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) を参照してください。
