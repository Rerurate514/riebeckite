---
date: 2026-10-08
title: テーマとプラグイン
sidebar.label: テーマとプラグイン
sidebar.order: 20
---
# テーマとプラグイン

## theme

`theme` は、テーマ定義が返すテーマインスタンスを受け取ります。定義はスタイル、設定スキーマ、プリセットを所有します。

| フィールド | 型 | 既定値 |
| --- | --- | --- |
| `colorMode` | `"light"` \| `"dark"` \| `"system"` | `"system"` |
| `layout` | `"article"` \| `"sidebar"` \| `"full-width"` | `"article"` |
| `preset` | 宣言されたプリセット名 | なし |
| `settings` | スキーマから推論 | スキーマの既定値 |
| `stylesheets` | `string[]` | `[]` |

Core がテーマがインスタンスであることを検証します。テーマオプションで省略した設定はプリセット、次にスキーマの既定値へフォールバックします。不明な設定キーや不正な値は解決時に `ThemeSettingsValidationError` を投げます。解決された値は `data-rb-theme`、`data-rb-mode`、`data-rb-layout`、`data-rb-setting-*` として反映されます。

### 宣言済みテーマ

テーマパッケージはファクトリを公開します。そのオプションを渡し、結果を `theme` に指定します。

```ts
import { defineConfig } from "@riebeckite/core";
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  site: { title: "My site" },
  theme: rerurateTheme({ colorMode: "system", settings: { motion: true } }),
});
```

テーマ固有のオプションは Core ではなく、テーマパッケージが所有します。詳しくは [Theme system](../theme-api.ja.md) を参照してください。

## plugins

`plugins` はプラグインインスタンスの配列です。`false`、`null`、`undefined` は取り除かれるため、真偽値でプラグインを切り替えられます。

```ts
plugins: [
  obsidianMarkdown(),
  enableSearch && search(),
]
```

解決時には無効な入力が取り除かれ、有効なプラグインが `order` で並べられ、ケイパビリティが検証されます。同じ `name` を持つ有効なプラグインが2つあると、解決に失敗します。各プラグインの `validateOptions` は設定の解決中に実行されます。

個々のプラグインオプションは[プラグインガイド](../../plugins/README.ja.md)と[Plugin system](../plugin-api.ja.md)に記載されています。
