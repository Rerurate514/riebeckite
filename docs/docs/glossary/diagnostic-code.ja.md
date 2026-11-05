---
date: 2026-10-14
title: 診断コード（Diagnostic Code）
sidebar:
  hidden: true
---

# 診断コード（Diagnostic Code）
診断コードは問題の種類を表す安定した識別子です。Core とプラグインは `duplicate-content-id`、`invalid-content-id`、`content-integrity:*` などのコードを共有し、`doctor` と Development Inspector で一貫した報告に使います。

## 一般的なコード
| コード | 既定の重大度 | 条件 |
| ---- | -- | -- |
| `duplicate-content-id` | `error` | 公開する複数のノートが同じ安定したコンテンツ ID を共有している |
| `invalid-content-id` | `error` | `id` の frontmatter が安定したコンテンツ ID の取り決めに反している |
| `content-integrity:broken-link` | `warning` | リンク先が存在しない |

## 使い方
その場限りのメッセージではなくコードを報告してください。`doctor` と Development Inspector が検出結果を一貫して分類し、集計できます。Core の `DiagnosticCode` 型は `packages/core/src/types/diagnostic.ts` にあり、プラグインは diagnostics プラグインの `content-integrity:*` のような独自コードを定義できます。

## 関連用語
- [[glossary/diagnostics|Diagnostics]]
- [[plugin|Plugin]]
- [[check|Check]]

## さらに詳しく
- [Diagnostics](../framework/diagnostics.ja.md)
