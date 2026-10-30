---
date: 2026-10-01
title: Tokyo Night
---
# Tokyo Night

[English](./tokyonight.md)

## 概要

`@riebeckite/theme-tokyonight` は公式テーマ **Tokyo Night** を提供します。テーマ ID は `tokyonight` です。技術的なタイポグラフィとネオンのアクセントを持つ、夜向けテーマです。

## 実際の表示例

**ライト**

![[theme-tokyonight-light.png]]

**ダーク**

![[theme-tokyonight-dark.png]]

## インストール

```sh
npm install @riebeckite/theme-tokyonight
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { tokyonightTheme } from "@riebeckite/theme-tokyonight";

export default defineConfig({
  theme: tokyonightTheme({
    colorMode: "system",
    settings: { density: "cozy" },
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
| `density` | select | 既定値 `"cozy"` — `cozy`、`compact` | 読書面の密度を選びます。 |
| `heading` | select | 既定値 `"tech"` — `tech`、`plain` | 見出しの表示スタイルを選びます。 |
| `neon` | boolean | 既定値 `false` | ネオンのハイライトを有効にします。 |
| `typography` | select | 既定値 `"system"` — `system`、`serif`、`sans`、`mono` | 本文の書体を選びます。 |
| `articleWidth` | slider | 既定値 `48` — 36–64、刻み 1 | 本文の最大幅を rem で設定します。 |
| `fontSize` | slider | 既定値 `1` — 0.9375–1.25、刻み 0.0625 | 本文の文字サイズを rem で設定します。 |
| `lineHeight` | slider | 既定値 `1.7` — 1.5–2.1、刻み 0.05 | 本文の行間を設定します。 |
| `aurora` | boolean | 既定値 `false` | 記事ヘッダー下のネオンオーロラ線をアニメーション表示します。 |

## プリセット

このテーマにはプリセットがありません。

## CSS と属性

ルートには `data-rb-theme="tokyonight"`、明示的にライトまたはダークを選んだ場合は `data-rb-mode`、そして `data-rb-layout` が設定されます。すべての設定は `data-rb-setting-<name>` 属性に反映されます。color、number、slider 型の設定は安全な `--rb-setting-<name>` カスタムプロパティとしても利用できます。

## 関連情報

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) を参照してください。
