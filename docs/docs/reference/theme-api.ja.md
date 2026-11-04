---
date: 2026-10-27
title: テーマ API
---
# テーマ API

[[glossary/theme|テーマ]]は呼び出し可能な定義です。設定スキーマを一度定義すると、設定、CSSへの反映、プレビュー、[[glossary/preset|プリセット]]、検証が同じスキーマを利用します。

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
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "私のサイト" },
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

解決順はスキーマの既定値、プリセット、明示した `settings` です。色・数値・スライダーは安全な `--rb-setting-*` カスタムプロパティとして、すべての設定は `data-rb-setting-*` 属性として反映されます。ルート属性は `data-rb-theme` と `data-rb-layout` です。`data-rb-mode` はライトまたはダークを明示した場合だけ付き、既定の `system` では省略されます。

テーマは意味的な `--rb-*` トークンを設定し、コンポーネントと[[glossary/plugin|プラグイン]]はそれを参照します。テーマ CSS はフレームワークとプラグインの CSS の後、`stylesheets` はサイト上書き用として最後に読み込まれます。

```css
:is(:root, .rb-theme-root)[data-rb-theme="my-theme"] {
  color: var(--rb-color-ink);
}

:is(:root, .rb-theme-root)[data-rb-theme="my-theme"][data-rb-setting-density="compact"] {
  --rb-layout-gap: 1rem;
}
```