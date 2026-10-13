---
title: Diagnostic code
sidebar:
  hidden: true
---

# Diagnostic code

Diagnostic code は問題のカテゴリを識別する安定した識別子で、`duplicate-content-id`、`invalid-content-id`、`content-integrity-*` など core と plugin が共有するセットがあり、`check` と `doctor` で一貫したレポートに使用されます。

## 一般的なコード

| コード | デフォルト severity | 条件 |
| -- | -- | -- |
| `duplicate-content-id` | `error` | 公開された注記が安定した content ID を共有 |
| `invalid-content-id` | `error` | `id` frontmatter が安定した content ID 契約に違反 |
| `content-integrity-missing-page` | `warn` | link target が存在しない |

## 使用方法

アドホックなメッセージではなくコードを報告することで、`check` と `doctor` が調査結果を一貫してカテゴリ分け・集計できるようにします。

## 関連用語

- [[glossary/diagnostics|Diagnostics]]
- [[plugin|Plugin]]
- [[check|Check]]

## さらに詳しく

- [Diagnostics](../framework/diagnostics.ja.md)
