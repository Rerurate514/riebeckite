---
title: Capability
sidebar:
  hidden: true
---

# Capability

Capabilityは、Pluginが提供または要求できる名前付きの機能です。依存解決はPluginを順序付け、失敗は構造化された診断として表示されます。

## Pluginが宣言するfield

`provides`: このPluginが公開するCapability名のリスト。
`requires`: このPluginが利用できる必要があるCapability名のリスト。
`optional`: 提供側が存在するときに使うCapability名のリスト。

## 解決

依存解決は、すべての`requires`が他のPluginの`provides`と一致することを確かめます。提供側の重複は失敗し、循環も失敗します。要求が欠けている場合は`PluginDependencyError`になります。

## 関連用語

- [[plugin|Plugin]]
- [[plugin-dependency|Plugin dependency]]
- [[lifecycle-hook|Lifecycle hook]]
- [[content-hook|Content hook]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Plugin System](../framework/plugin-system.ja.md)
