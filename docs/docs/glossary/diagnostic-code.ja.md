---
date: 2026-10-14
title: 診断コード（Diagnostic Code）
sidebar:
  hidden: true
---

# 診断コード（Diagnostic Code）
診断コードは問題の種類を表す安定した識別子です。Coreとプラグインは`duplicate-content-id`、`invalid-content-id`、`content-integrity-*`などのコードを共有し、`check`と`doctor`で一貫した報告に使います。

## 一般的なコード
| コード | 既定の重大度 | 条件 |
| ---- | -- | -- |
| `duplicate-content-id` | `error` | 公開する複数のノートが同じ安定したコンテンツIDを共有している |
| `invalid-content-id` | `error` | `id`のfrontmatterが安定したコンテンツIDの取り決めに反している |
| `content-integrity-missing-page` | `warn` | リンク先が存在しない |

## 使い方
その場限りのメッセージではなくコードを報告してください。`check`と`doctor`が検出結果を一貫して分類し、集計できます。コードは`packages/core/src/diagnostic_code.ts`で定義され、プラグインが拡張できます。

## 関連用語
- [[glossary/diagnostics|Diagnostics]]
- [[plugin|Plugin]]
- [[check|Check]]

## さらに詳しく
- [Diagnostics](../framework/diagnostics.ja.md)
