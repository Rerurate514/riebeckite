---
date: 2026-10-27
title: テーマ設定
sidebar.label: テーマ設定
sidebar.order: 70
---
# テーマ設定

`theme` にはテーマインスタンスを渡します。

```ts
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  theme: defaultTheme({
    colorMode: "system",
    layout: "article",
    preset: "reading",
    settings: { typography: "serif" },
    stylesheets: ["/site.css"],
  }),
});
```

設定は選択した[[glossary/theme|テーマ]]のスキーマに対して検証されます。スキーマと CSS への反映は[テーマ API](../theme-api.ja.md)を参照してください。