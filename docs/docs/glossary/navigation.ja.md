---
title: Navigation
sidebar:
  hidden: true
---

# Navigation

サイトのナビゲーション設定と、解決されたmanifestからヘッダー/フッターのリンクを描画するナビゲーションプラグインです。

## ナビゲーション設定

ナビゲーションは`navigation`プラグインを使用して解決されたmanifestから構築されます。エントリは`discoverable`コンテンツから派生し、`navigation`configセクションでカスタマイズできます。

```ts
import { buildNavigation } from "@riebeckite/plugins/navigation";

const nav = buildNavigation(manifest.discoverableEntries, {
  items: [
    { label: "Home", href: "/" },
    { label: "Tags", href: "/tags" },
  ],
});
```

## 関連用語

- [[glossary/site|Site]]
- [[site-config|Site Config]]
- [[route|Route]]

## さらに詳しく

- [../plugins/navigation.ja.md]