---
date: 2026-09-30
title: テーマ
sidebar:
  label: テーマ
  order: 50
  collapsed: true
---

# テーマ

テーマは読書面を定義します。型付き設定スキーマを使い、設定、実行時検証、プレビュー操作部、安全な CSS 反映を一つの情報源にまとめます。

## 試す・導入する

[テーマショーケース](/themes) では、すべての公式テーマをサンドボックス化した文書で確認できます。設定、プリセット、ライト / ダーク / システム、デスクトップ / タブレット / モバイル、リセット、設定の出力をその場で試せます。

```sh
npm install @riebeckite/theme-garden
```

```ts
import { defineConfig } from "@riebeckite/core";
import { gardenTheme } from "@riebeckite/theme-garden";

export default defineConfig({
  theme: gardenTheme({
    colorMode: "system",
    preset: "reading",
    settings: { typography: "serif" },
  }),
});
```

## オプション

すべてのテーマファクトリーは `colorMode`、`layout`、`preset`、`settings`、`stylesheets` を受け取ります。設定はテーマ側で宣言され、TypeScript が推論し、実行時にも検証され、`data-rb-setting-*` 属性に反映されます。解決順は既定値、プリセット、明示した設定です。

ルート属性は `data-rb-theme`、明示的なライト / ダークの `data-rb-mode`、`data-rb-layout` です。システムモードでは `data-rb-mode` を付けません。

## 公式テーマ

- [Default](./default.md)
- [Editorial](./editorial.md)
- [Fieldnotes](./fieldnotes.md)
- [Folio](./folio.md)
- [Garden](./garden.md)
- [Gruvbox](./gruvbox.md)
- [Minimal](./minimal.md)
- [Module](./module.md)
- [Rerurate](./rerurate.md)
- [Sakura](./sakura.md)
- [Signal](./signal.md)
- [Technical](./technical.md)
- [Terminal](./terminal.md)
- [Tokyo Night](./tokyonight.md)

機能には [Plugin](../plugins/README.md) を使います。契約の詳細は [テーマを書く](./writing-a-theme.ja.md) と [Theme API](../reference/theme-api.md) を参照してください。
