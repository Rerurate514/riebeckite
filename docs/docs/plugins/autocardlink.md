# AutoCardLink

`cardlink` コードブロックをリンクプレビューカードとして描画する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-autocardlink
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

URL だけでなく、タイトル・説明・favicon・プレビュー画像を添えたカードとしてリンクを表示したい場合に利用します。

````markdown
```cardlink
url: https://example.com/post
title: "Example post"
description: "A short summary of the linked page."
host: example.com
```
````

```cardlink
url: https://riebeckite.dev/
title: "Riebeckite — Markdown と Obsidian のサイトフレームワーク"
description: "Markdown や Obsidian のノートから、拡張できる Web サイトを作るオープンソースフレームワークです。コンテンツはそのままに、Plugin と Theme でサイトを組み立てられます。"
host: riebeckite.dev
favicon: https://riebeckite.dev/favicon.ico
image: https://riebeckite.dev/ogp.png
```

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。
