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

## 解決の詳細
プラグインの依存解決器（`resolvePluginDependencies`、`packages/core/src/plugin/plugin_dependency.ts`）は、Capability名を検証し、提供側の重複を検出して失敗させ、トポロジカルソートで依存関係を解決します。必須のCapabilityが欠けている場合は、`PluginDependencyError`が`kind: "missing-capability"`で投げられます。自己依存は`kind: "self-dependency"`、循環は`kind: "cycle"`として投げられ、Capability名とPluginのチェーンが含まれます。`CapabilityDeclaration`型は`"provides" | "requires" | "optional"`で、名前の検証に使われます（`packages/core/src/plugin/plugin_dependency_error.ts`）。

## 関連用語

- [[plugin|Plugin]]
- [[plugin-dependency|Plugin dependency]]
- [[lifecycle-hook|Lifecycle hook]]
- [[content-hook|Content hook]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Plugin System](../framework/plugin-system.ja.md)
