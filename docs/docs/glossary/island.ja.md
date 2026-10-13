---
title: Island
sidebar:
  hidden: true
---

# Island

Island はサーバーサイドで描画され、必要な箇所でのみ client が hydrate するコンポーネントです; ページ全体を hydrate せずにインタラクティブな UI セクションを可能にします。Island コンポーネントはプラグインではなく site application で定義されます。

## Island パターン

Island では、インタラクティブなコンポーネント (widget、chart など) をサーバーで描画し、必要な箇所でのみ client で hydrate します。これにより JavaScript ペイロードを削減し、time-to-interactive を改善します。

## Site の責任

site application は island の配置、routing、hydration を所有します。plugin は body slots で描画された HTML フラグメントを寄せることはできますが、island logic は app 層に居ります。

## 関連用語

- [[plugin|Plugin]]
- [[renderer|Renderer]]
- [[slot|Body slot]]
- [[page-type|Page Type]]

## さらに詳しく

- [HonoX UI](../framework/honox-integration/ui.ja.md)
- [Plugin API](../reference/plugin-api.ja.md)
