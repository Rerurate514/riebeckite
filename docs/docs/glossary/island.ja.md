---
title: Island
sidebar:
  hidden: true
---

# Island

Islandはサーバー側で描画され、必要な箇所だけクライアントでhydrationされるコンポーネントです。ページ全体をhydrationせずに、対話的なUIの一部だけを動かせます。IslandコンポーネントはPluginではなくサイトのapplicationで定義します。

## Islandパターン

Islandでは、対話的なコンポーネント（widget、chartなど）をサーバーで描画し、必要な箇所だけクライアントでhydrationします。これによりJavaScriptのペイロードを減らし、操作できるまでの時間を短くします。

## Siteの責任

サイトのapplicationがislandの配置、routing、hydrationを担います。Pluginはbody slotに描画したHTMLの断片を渡せますが、islandのlogicはapp層にあります。

## 関連用語

- [[plugin|Plugin]]
- [[renderer|Renderer]]
- [[slot|Body slot]]
- [[page-type|Page Type]]

## さらに詳しく

- [HonoX UI](../framework/honox-integration/ui.ja.md)
- [Plugin API](../reference/plugin-api.ja.md)
