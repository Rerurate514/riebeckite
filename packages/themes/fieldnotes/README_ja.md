# @riebeckite/theme-fieldnotes

<!-- Generated from docs/docs/themes/fieldnotes.ja.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

[English](./README.md)

`@riebeckite/theme-fieldnotes` は公式テーマ **Fieldnotes** を提供します。テーマ ID は `fieldnotes` です。紙面、マージン、記録マークを備えたリサーチノート風のテーマです。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { fieldnotesTheme } from "@riebeckite/theme-fieldnotes";

export default defineConfig({
  theme: fieldnotesTheme({
    colorMode: "system",
    preset: "journal",
    settings: { paperStyle: "ruled" },
  }),
});
```

`colorMode` は `"light"`、`"dark"`、`"system"`、`layout` は `"article"`、`"sidebar"`、`"full-width"` です。`stylesheets` はテーマ CSS の後にサイト固有のスタイルシートを追加します。プリセットを適用した後に、明示した `settings` が優先されます。

## 設定

Fieldnotes には `paperStyle`、`inkColor`、`marginRule`、`indexMarks`、`texture` があります。プリセットは `journal`、`laboratory`、`archive` です。

設定は `data-rb-setting-<name>` 属性へ反映されます。ルートには `data-rb-theme="fieldnotes"`、明示的なライト / ダーク時だけ `data-rb-mode`、そして `data-rb-layout` が設定されます。

[Theme API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md) と [テーマを書く](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.ja.md) も参照してください。
