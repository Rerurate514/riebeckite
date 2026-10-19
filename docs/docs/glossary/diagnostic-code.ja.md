---
title: Diagnostic code
sidebar:
  hidden: true
---

# Diagnostic code
Diagnostic codeは問題の種類を識別する安定した識別子です。`duplicate-content-id`、`invalid-content-id`、`content-integrity-*`などCoreとPluginが共有するものがあり、`check`と`doctor`で一貫したレポートに使います。

## 一般的なコード
| コード | 既定のseverity | 条件 |
| -- | -- | -- |
| `duplicate-content-id` | `error` | 公開するノートが同じcontent IDを共有している |
| `invalid-content-id` | `error` | `id` frontmatterがcontent IDの規則に反している |
| `content-integrity-missing-page` | `warn` | リンク先が存在しない |

## 使い方
その場限りのメッセージではなくコードを報告すると、`check`と`doctor`が調査結果を一貫して分類・集計できます。コードは`packages/core/src/diagnostic_code.ts`で定義され、Pluginでも拡張できます。

## 関連用語
- [[glossary/diagnostics|Diagnostics]]
- [[plugin|Plugin]]
- [[check|Check]]

## さらに詳しく
- [Diagnostics](../framework/diagnostics.ja.md)