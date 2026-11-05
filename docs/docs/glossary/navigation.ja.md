---
date: 2026-10-14
title: ナビゲーション（Navigation）
sidebar:
  hidden: true
---

# ナビゲーション（Navigation）

サイトのナビゲーション設定と、解決済みマニフェストからヘッダー/フッターのリンクを描画するナビゲーションプラグインです。

## ナビゲーション設定

ナビゲーションは `navigation` プラグインを使って、解決済みマニフェストから構築されます。`items` を渡さない場合は `discoverable` なコンテンツから項目を導出し、トップレベルの設定セクションではなくプラグインのオプションでカスタマイズします。

```ts
import { navigation } from "@riebeckite/plugin-navigation";

plugins: [
  navigation({
    items: [
      { label: "Home", href: "/" },
      { label: "Tags", href: "/tags" },
    ],
  }),
],
```

## ナビゲーションプラグイン
`navigation` プラグイン（`packages/plugins/navigation/src/navigation.ts`）は、解決済みマニフェストの検出可能エントリからヘッダー/フッターのリンクを描画します。ナビゲーション構造は次のように構築します。

- `manifest.discoverableEntries` を読んで、検出可能なコンテンツをすべて取得する
- `items` と `secondary` のプラグインオプションで、ラベル、href、並び順を指定できる
- 入れ子のメニュー構造と、アクティブなルートのハイライトに対応する

プラグインは構築したナビゲーションを、インテグレーションのページ描画を通じてサイトのレイアウトに渡します。サイト側は独自のルート描画や独自の項目を用意することで、ナビゲーション UI を完全にカスタマイズできます。

```ts
// 例：ナビゲーションオプションのカスタマイズ
navigation({
  items: [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
  ],
})
```

## 関連用語

- [[glossary/site|Site]]
- [[site-config|Site Config]]
- [[route|Route]]

## さらに詳しく

- [../plugins/navigation.ja.md]
