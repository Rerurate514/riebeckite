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

## ナビゲーションプラグイン
`navigation`プラグイン(`packages/plugins/navigation/src/index.ts`)は、resolved manifestのdiscoverable entryからヘッダー/フッターのリンクを描画します。以下の方法で構造を構築します：

- `manifest.discoverableEntries`を読み取ってすべてのdiscoverableコンテンツを取得
- `navigation`configセクションでカスタマイズ可能。itemラベル、href、並び順を指定可能
- ネストされたメニュー構造とアクティブルートハイライトをサポート

プラグインはビルドされたnavigationをintegrationのページ描画に寄与します。サイトはnavigation UIを完全にカスタマイズでき、独自のroute描画を提供するか、`navigation`configセクションを修正することで可能です。

```ts
// Example: custom navigation config
navigation: {
  items: [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
  ],
},
```

## 関連用語

- [[glossary/site|Site]]
- [[site-config|Site Config]]
- [[route|Route]]

## さらに詳しく

- [../plugins/navigation.ja.md]