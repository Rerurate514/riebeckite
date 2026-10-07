# Docs

Markdown content の subtree から Docs 用 sidebar navigation と previous/next を生成する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-docs
```

## 使用例

```ts
import { docs } from "@riebeckite/plugin-docs";

export default defineConfig({
  plugins: [
    docs({
      root: "docs",
      sidebar: { auto: true },
      prevNext: true,
    }),
  ],
});
```

```yaml
---
title: Installation
sidebar:
  order: 2
---
```

`root` は対象にする content subtree です。Plugin は manifest で解決済みの public location を使うため、permalink、rename、alias、l10n、公開判定の責務を Content System から奪いません。

## 詳細仕様

option、frontmatter metadata、Theme hook、l10n との関係、公開境界については package README を参照してください。Plugin の layout fragment は [Plugin API](../reference/plugin-api.ja.md) の標準 article body slot を通じて描画されます。

