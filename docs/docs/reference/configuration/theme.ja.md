---
date: 2026-10-27
title: テーマ設定
sidebar:
  label: テーマ設定
  order: 70
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

設定は選択したテーマのスキーマに対して検証されます。スキーマとCSSへの反映は[テーマ API](../theme-api.ja.md)を参照してください。