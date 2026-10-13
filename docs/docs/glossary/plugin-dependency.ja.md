---
title: Plugin Dependency
sidebar:
  hidden: true
---

# Plugin Dependency

capability を基にした Plugin 間の関係です。各 Plugin が provides、requires、optional の capability を宣言し、Core がトポロジカルソートで順序を解決し、必須の capability が無ければ失敗します。

## 役割

- Plugin を順序付け、欠けた capability を報告します。
- import の順序ではなく宣言した capability を使います。

## 関連用語

- [[plugin|Plugin]]
- [[lifecycle-hook|Lifecycle Hook]]
- [[content-hook|Content Hook]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Plugin System](../framework/plugin-system.ja.md)
