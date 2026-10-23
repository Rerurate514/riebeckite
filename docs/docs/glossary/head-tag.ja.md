---
date: 2026-10-14
title: headタグ（Head Tag）
sidebar:
  hidden: true
---

# headタグ（Head Tag）
ページのheadタグとメタデータはプラグインシステムを通じて提供されます。インテグレーションとサイトのアプリケーションが、タイトル、説明、言語属性を含む最終的な`<head>`を組み立てます。

## headの組み立て
プラグインはページ種別とSEO拡張を通じてhead関連のデータを提供できます。最終的な`<head>`は、インテグレーション（`@riebeckite/honox`）とサイトのアプリケーションが、Coreの既定値、プラグインの提供分、独自のメタデータをまとめて組み立てます。

## SEOとの統合
`seo`拡張ポイントにより、プラグインはメタデータとフィードの挙動に参加できます。headタグはプラグインの直接のアセットではなく、インテグレーションの境界を通って流れます。プラグインはページ種別の`seo`フィールドまたは`seo`拡張を使ってメタデータを提供します。

## 関連用語
- [[plugin|Plugin]]
- [[asset|Asset]]

## さらに詳しく
- [Plugin API](../reference/plugin-api.ja.md)
- [HonoX UI](../framework/honox-integration/ui.ja.md)
