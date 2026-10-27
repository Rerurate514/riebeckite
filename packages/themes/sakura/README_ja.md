# @riebeckite/theme-sakura

<!-- Generated from docs/docs/themes/sakura.ja.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

[English](./README.md)

`@riebeckite/theme-sakura` は公式テーマ **Sakura** を提供します。テーマ ID は `sakura` です。設定スキーマが設定とプレビュー操作部の唯一の情報源になります。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  theme: sakuraTheme({
    colorMode: "system",
    preset: "reading",
    settings: { typography: "serif" },
  }),
});
```

`colorMode` は `"light"`、`"dark"`、`"system"`、`layout` は `"article"`、`"sidebar"`、`"full-width"` です。`stylesheets` はテーマ CSS の後にサイト固有のスタイルシートを追加します。プリセットを適用した後に、明示した `settings` が優先されます。

## 設定

ラベル、説明、select の選択肢、slider の範囲、ライト・ダークの既定値を含む完全な型付きスキーマは `sakuraTheme.settings` を参照してください。不明な設定や不正な値は解決時に拒否されます。このテーマには `reading` プリセットがあります。

設定は `data-rb-setting-<name>` 属性へ反映されます。ルートには `data-rb-theme="sakura"`、明示的なライト / ダーク時だけ `data-rb-mode`、そして `data-rb-layout` が設定されます。

[Theme API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md) と [テーマを書く](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.ja.md) も参照してください。
