---
title: テーマを書く
---

# テーマを書く

テーマは、型付き設定スキーマを持つ呼び出し可能な定義です。CSS は見た目のトークンと安定した `rb-*` / `rr-*` フックを担当し、Core は検証、解決、属性への反映を担当します。

```ts
import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const localTheme = defineTheme({
  name: "local",
  styles: [{ moduleSpecifier: "@acme/theme-local/style.css" }],
  settings: defineThemeSettings({
    accent: { type: "color", label: "Accent", default: "#b3472f" },
    density: { type: "slider", label: "Density", default: 1, min: 0.8, max: 1.2, step: 0.1 },
    serif: { type: "boolean", label: "Use serif", default: false },
  }),
  presets: { reading: { label: "Reading", settings: { serif: true } } },
});
```

利用できる設定は `color`、`boolean`、`number`、`slider`、`select`、`text` です。すべてに `label` と `default` が必要です。必要に応じて `description`、`group`、`section`、`light`、`dark`、範囲、select の選択肢を指定します。Core は未知のキーと不正な値を拒否します。

## CSS 契約

テーマ CSS は `:is(:root, .rb-theme-root)[data-rb-theme="local"]` にスコープします。明示的なモードは `[data-rb-mode="dark"]`、システムダークは `@media (prefers-color-scheme: dark)` 内の `:not([data-rb-mode])` を使います。レイアウトには `data-rb-layout`、スキーマ設定には `data-rb-setting-*` を使います。

```css
:is(:root, .rb-theme-root)[data-rb-theme="local"] { --rb-color-accent: var(--rb-setting-accent); }
:is(:root, .rb-theme-root)[data-rb-theme="local"][data-rb-setting-serif="true"] { --rb-font-body: Georgia, serif; }
```

テーマスタイルはフレームワークとプラグインの後に読み込まれます。設定した `stylesheets` は最後に読み込まれます。セマンティックな `--rb-*` の値を安定させ、テーマに実行時の機能を入れないでください。

[Theme API](../reference/theme-api.md) も参照してください。