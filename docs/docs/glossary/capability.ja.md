---
title: Capability
sidebar:
  hidden: true
---

# Capability

キャビリティとはプラグインが提供または要求できる名前付きの機能です; resolver はプラグインを順序付け、失敗は構造化された診断として表示されます。

## プラグイン上のフィールド

`provides`: このプラグインが公開するキャビリティ名のリスト。
`requires`: このプラグインが利用可能である必要があるキャビリティ名のリスト。
`optional`: プロバイダが存在する場合に使用されるキャビリティ名のリスト。

## 解決

resolver はすべての `requires` が他のプラグインの `provides` と一致することを検証します。重複プロバイダは失敗し、サイクルも失敗します。欠落した要求は `PluginDependencyError` をthrow します。

## 関連用語

- [[plugin|Plugin]]
- [[plugin-dependency|Plugin dependency]]
- [[lifecycle-hook|Lifecycle hook]]
- [[content-hook|Content hook]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Plugin System](../framework/plugin-system.ja.md)
