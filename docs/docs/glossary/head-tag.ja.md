---
title: Head tag
sidebar:
  hidden: true
---

# Head tag
ページのheadタグとメタデータはPluginシステムを通じて追加されます。Integrationとサイトのapplicationがタイトル、description、言語属性をまとめて最終的な`<head>`を組み立てます。

## Headの組み立て
Pluginはpage typeとseo拡張を通じてhead関連のデータを追加できます。最終的な`<head>`は、Integration（`@riebeckite/honox`）とサイトのapplicationが、Coreの既定、Pluginの追加分、customなメタデータをまとめて組み立てます。

## SEO integration
`seo`拡張ポイントは、Pluginがメタデータとfeedの動作に参加できるようにします。head tagはPluginの直接のassetではなく、Integrationの境界を通って流れます。Pluginはpage typeの`seo`フィールドや`seo`拡張を使用してメタデータを貢献します。

## 関連用語
- [[plugin|Plugin]]
- [[asset|Asset]]
- [[slot|Body slot]]

## さらに詳しく
- [Plugin API](../reference/plugin-api.ja.md)
- [HonoX UI](../framework/honox-integration/ui.ja.md)