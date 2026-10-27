# @riebeckite/theme-signal

<!-- Generated from docs/docs/themes/signal.ja.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

[English](./README.md)

`@riebeckite/theme-signal` は公式テーマ **Signal** を提供します。テーマ ID は `signal` です。太いルールとグラフィックマーカーを使う、スイススタイルのネオブルータリストな読書面です。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { signalTheme } from "@riebeckite/theme-signal";

export default defineConfig({
  theme: signalTheme({
    colorMode: "system",
    preset: "editorial",
    settings: { accentColor: "#e63b17" },
  }),
});
```

`colorMode` は `"light"`、`"dark"`、`"system"`、`layout` は `"article"`、`"sidebar"`、`"full-width"` です。`stylesheets` はテーマ CSS の後にサイト固有のスタイルシートを追加します。プリセットを適用した後に、明示した `settings` が優先されます。

## 設定

Signal には `accentColor`、`borderWeight`、`typography`、`density`、`markers` があります。プリセットは `poster`、`editorial`、`reading` です。

設定は `data-rb-setting-<name>` 属性へ反映されます。ルートには `data-rb-theme="signal"`、明示的なライト / ダーク時だけ `data-rb-mode`、そして `data-rb-layout` が設定されます。

[Theme API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md) と [テーマを書く](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.ja.md) も参照してください。
