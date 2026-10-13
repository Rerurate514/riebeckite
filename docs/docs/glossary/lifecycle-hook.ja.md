---
title: Lifecycle Hook
sidebar:
  hidden: true
---

# Lifecycle Hook

setup、buildStart、buildEnd、dispose といった Build の段階で実行される Plugin の hook です。依存の順序で実行され、setup と dispose は逆順で実行されます。

## 役割

- 定義された Build の段階で Plugin のコードを実行します。
- Build の前後で依存の順序に従って実行します。

## 関連用語

- [[plugin|Plugin]]
- [[content-hook|Content Hook]]
- [[plugin-dependency|Plugin Dependency]]
- [[build|Build]]

## さらに詳しく

- [Plugin Lifecycle](../framework/plugin-system/lifecycle.ja.md)
- [Plugin API](../reference/plugin-api.ja.md)
