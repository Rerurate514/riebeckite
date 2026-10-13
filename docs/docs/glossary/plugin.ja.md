---
title: Plugin
sidebar:
  hidden: true
---

# Plugin

Core の Plugin 契約を通して機能を追加する再利用可能な拡張です。Plugin は Markdown と HTML のパイプラインを拡張し、page type、diagnostic、asset、client entry を提供し、宣言した capability によって順序付けられます。

## 役割

- Core を変えずに機能を追加します。
- 順序付けのため provides と requires の capability を宣言します。

## 関連用語

- [[plugin-dependency|Plugin Dependency]]
- [[lifecycle-hook|Lifecycle Hook]]
- [[renderer|Renderer]]
- [[plugin-cache|Plugin Cache]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Plugin System](../framework/plugin-system.ja.md)
