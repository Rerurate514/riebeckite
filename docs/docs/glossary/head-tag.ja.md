---
title: Head tag
sidebar:
  hidden: true
---

# Head tag

ページの head タグとメタデータはプラグインシステムを通じて貢献され、integration と site application がタイトル、description、言語属性を結合して final `<head>` を compose します。

## Head の組み立て

プラグインは page types と seo extensions を通じて head 関連データに貢献できます。final `<head>` は integration (`@riebeckite/honox`) と site application が core の default、plugin の貢献、custom metadata を結合して compose します。

## SEO integration

 `seo` 拡張ポイントはプラグインがメタデータと feed 動作に参加できるようにします。head tag は直接のプラグインアセットではありません; integration 境界を通じて流れます。

## 関連用語

- [[plugin|Plugin]]
- [[asset|Asset]]
- [[slot|Body slot]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [HonoX UI](../framework/honox-integration/ui.ja.md)
