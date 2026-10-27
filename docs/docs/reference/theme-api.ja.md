---
date: 2026-10-27
title: テーマ API
---
# テーマ API

テーマは呼び出し可能な定義です。設定スキーマを一度定義すると、設定、CSSへの反映、プレビュー、プリセット、検証が同じスキーマを利用します。

```ts
import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const myTheme = defineTheme({
  name: "my-theme",
  styles: [{ moduleSpecifier: "/themes/my-theme.css" }],
  settings: defineThemeSettings({
    accent: {
      type: "color",
      label: "アクセント色",
      default: "#176b5a",
      light: "#176b5a",
      dark: "#78d2b3",
    },
    density: {
      type: "select",
      label: "密度",
      default: "comfortable",
      options: [
        { value: "comfortable", label: "標準" },
        { value: "compact", label: "コンパクト" },
      ],
    },
  }),
  presets: {
    compact: { label: "コンパクト", settings: { density: "compact" } },
  },
});
```

テーマは呼び出して設定に渡します。

```ts
export default defineConfig({
  theme: myTheme({
    colorMode: "system",
    layout: "article",
    preset: "compact",
    settings: { accent: "#cc5500" },
    stylesheets: ["/site.css"],
  }),
});
```

`settings` は `color`、`boolean`、`number`、`slider`、`select`、`text` を受け取ります。すべての設定にラベルと既定値を持たせ、説明、セクション、グループ、ライト・ダーク時の値、数値の範囲、選択肢も指定できます。不明なキーや不正な値は実行時に拒否されます。

解決順はスキーマの既定値、プリセット、明示した `settings` です。色・数値・スライダーは安全な `--rb-setting-*` カスタムプロパティとして、すべての設定は `data-rb-setting-*` 属性として反映されます。ルート属性は `data-rb-theme`、`data-rb-mode`、`data-rb-layout` です。

テーマは意味的な `--rb-*` トークンを設定し、コンポーネントとプラグインはそれを参照します。テーマCSSはフレームワークとプラグインのCSSの後、`stylesheets` はサイト上書き用として最後に読み込まれます。