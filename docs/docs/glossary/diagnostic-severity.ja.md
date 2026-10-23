---
date: 2026-10-14
title: Diagnostic severity
sidebar:
  hidden: true
---

# Diagnostic severity
Severityはerror、warn、infoの三段階で、正しい出力を保てるかどうかを基準に決めます。errorは正しい出力を妨げる問題、warnは注意が必要な潜在的な問題、infoは出力の正しさに影響しない補足情報です。

## Severityの値
- `error`: 正しい出力を妨げる問題です。ビルドが失敗したり、公開するコンテンツが無効になったりします。
- `warn`: 出力はまだ正しいものの、注意が必要な状態です。たとえば、リンク先が変わった可能性があります。
- `info`: 補足情報です。出力の正しさには影響しません。

## Severityの選び方
公開する出力への影響に応じてseverityを選びます。判断に迷うときは、安全でない出力を黙って出すより、不確かさを報告する側に倒します。errorはビルドを停止させます；warnはビルドは完了しますがissueをフラグ付けします；infoはビルド結果に影響しません。

## 関連用語
- [[plugin|Plugin]]
- [[glossary/diagnostics|Diagnostics]]
- [[diagnostic-code|Diagnostic code]]
- [[doctor|Doctor]]

## さらに詳しく
- [Diagnostics](../framework/diagnostics.ja.md)