---
title: Tokyo Night
---
# Tokyo Night

`@riebeckite/theme-tokyonight` は公式テーマ **Tokyo Night** を提供します。テーマ ID は `tokyonight` です。設定スキーマが設定とプレビュー操作部の唯一の情報源になります。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { tokyonightTheme } from "@riebeckite/theme-tokyonight";

export default defineConfig({
  theme: tokyonightTheme({
    colorMode: "system",
    preset: "reading",
    settings: { typography: "serif" },
  }),
});
```

`colorMode` は `"light"`、`"dark"`、`"system"`、`layout` は `"article"`、`"sidebar"`、`"full-width"` です。`stylesheets` はテーマ CSS の後にサイト固有のスタイルシートを追加します。プリセットを適用した後に、明示した `settings` が優先されます。

## 設定

ラベル、説明、select の選択肢、slider の範囲、ライト・ダークの既定値を含む完全な型付きスキーマは `tokyonightTheme.settings` を参照してください。不明な設定や不正な値は解決時に拒否されます。このテーマには `reading` プリセットがあります。

設定は `data-rb-setting-<name>` 属性へ反映されます。ルートには `data-rb-theme="tokyonight"`、明示的なライト / ダーク時だけ `data-rb-mode`、そして `data-rb-layout` が設定されます。

[Theme API](../reference/theme-api.md) と [テーマを書く](./writing-a-theme.ja.md) も参照してください。