---
title: Terminal
---
# Terminal

[English](./terminal.md)

`@riebeckite/theme-terminal` は公式テーマ **Terminal** を提供します。テーマ ID は `terminal` です。コードと技術ノート向けの、抑制された蛍光表示の CLI 風テーマです。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { terminalTheme } from "@riebeckite/theme-terminal";

export default defineConfig({
  theme: terminalTheme({
    colorMode: "system",
    preset: "classic",
    settings: { phosphor: "green" },
  }),
});
```

`colorMode` は `"light"`、`"dark"`、`"system"`、`layout` は `"article"`、`"sidebar"`、`"full-width"` です。`stylesheets` はテーマ CSS の後にサイト固有のスタイルシートを追加します。プリセットを適用した後に、明示した `settings` が優先されます。

## 設定

Terminal には `phosphor`、`scanlines`、`glow`、`frameStyle`、`cursor` があります。プリセットは `classic`、`amber`、`modern` です。動きを減らす設定ではカーソルのアニメーションを止めます。

設定は `data-rb-setting-<name>` 属性へ反映されます。ルートには `data-rb-theme="terminal"`、明示的なライト / ダーク時だけ `data-rb-mode`、そして `data-rb-layout` が設定されます。

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) も参照してください。
