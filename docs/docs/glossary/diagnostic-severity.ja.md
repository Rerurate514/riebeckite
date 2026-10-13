---
title: Diagnostic severity
sidebar:
  hidden: true
---

# Diagnostic severity

Severity レベル (error, warn, info) は output が正しく残せるかどうか proportionate に設定されます; error は output が正しく残せない場合、warn は注意が必要な潜在的な問題、info は contextual 情報で output の正しさに影響しません。

## Severity 値

`error`: output が正しく残せない場合; ビルドが失敗したり公開されたコンテンツが無効になったりします。
`warn`: output がまだ正しく残せますが注意が必要です; 例: link target が変更された可能性があります。
`info`: contextual 情報; output の正しさに影響しません。

##  proportion

published output への影響に応じて severity を選択します。不明確な場合は安全側に倒して silently choosing unsafe output にはしないでください。

## 関連用語

- [[plugin|Plugin]]
- [[glossary/diagnostics|Diagnostics]]
- [[diagnostic-code|Diagnostic code]]
- [[doctor|Doctor]]

## さらに詳しく

- [Diagnostics](../framework/diagnostics.ja.md)
