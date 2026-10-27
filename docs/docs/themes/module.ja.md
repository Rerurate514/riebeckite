---
title: Module
---
# Module

[English](./module.md)

`@riebeckite/theme-module` は公式テーマ **Module** を提供します。精密な設計グリッド、鋼材のような面、暖色のエッジライトを組み合わせ、技術メモを暗く意志のある画面に仕上げます。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { moduleTheme } from "@riebeckite/theme-module";

export default defineConfig({
  theme: moduleTheme({
    colorMode: "dark",
    settings: { glow: true },
  }),
});
```

`colorMode` は `"light"`、`"dark"`、`"system"`、`layout` は `"article"`、`"sidebar"`、`"full-width"` です。`stylesheets` はテーマ CSS の後にサイト固有のスタイルシートを追加します。プリセットを適用した後に、明示した `settings` が優先されます。

## 設定

ラベル、説明、select の選択肢、slider の範囲、ライト・ダークの既定値を含む完全な型付きスキーマは `moduleTheme.settings` を参照してください。不明な設定や不正な値は解決時に拒否されます。このテーマには `reading` プリセットがあります。

設定は `data-rb-setting-<name>` 属性へ反映されます。ルートには `data-rb-theme="module"`、明示的なライト / ダーク時だけ `data-rb-mode`、そして `data-rb-layout` が設定されます。

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) も参照してください。
