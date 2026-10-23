---
date: 2026-10-14
title: ケイパビリティ（Capability）
sidebar:
  hidden: true
---

# ケイパビリティ（Capability）

ケイパビリティは、プラグインが提供または要求できる名前付きの機能です。依存解決はプラグインを順序付け、失敗は構造化された診断として現れます。

## プラグインのフィールド

`provides`：このプラグインが公開するケイパビリティ名の一覧。
`requires`：このプラグインが利用できる必要があるケイパビリティ名の一覧。
`optional`：提供側が存在するときに使うケイパビリティ名の一覧。

## 解決

プラグインのリゾルバーは、すべての`requires`に対応する`provides`が別のプラグインにあることを検証します。提供側の重複は失敗します。循環も失敗します。必須の要求が欠けている場合は`PluginDependencyError`を投げます。

プラグインのリゾルバー（`packages/core/src/plugin/plugin_dependency.ts`の`resolvePluginDependencies`）は、ケイパビリティ名を検証し、提供側を集め、重複があれば失敗させ、トポロジカルソートで依存関係を解決します。必須のケイパビリティが欠けている場合は`kind: "missing-capability"`の`PluginDependencyError`を投げます。自己依存は`kind: "self-dependency"`、循環は`kind: "cycle"`として投げられ、ケイパビリティ名とプラグインの連鎖を含みます。`CapabilityDeclaration`型は`"provides" | "requires" | "optional"`で、`packages/core/src/plugin/plugin_dependency_error.ts`での名前の検証に使われます。

## 関連用語

- [[plugin|Plugin]]
- [[plugin-dependency|Plugin dependency]]
- [[lifecycle-hook|Lifecycle hook]]
- [[content-hook|Content hook]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Plugin System](../framework/plugin-system.ja.md)
