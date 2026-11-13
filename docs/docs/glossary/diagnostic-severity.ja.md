---
date: 2026-10-14
title: 診断の重大度（Diagnostic Severity）
sidebar.hidden: true
---

# 診断の重大度（Diagnostic Severity）
重大度は error、warning、info の3段階で、出力が正しいままでいられるかどうかに応じて決めます。error は正しい出力を妨げる問題、warning は潜在的な問題への注意、info は補足情報を表します。

## 重大度の値
- `error`：出力が正しいままでいられません。ビルドが失敗するか、公開するコンテンツが無効になります。
- `warning`：出力は正しいままかもしれませんが、注意が必要です。たとえば、リンク先が変わった可能性があります。
- `info`：補足情報です。出力の正しさには影響しません。

## 重大度の選び方
公開する出力への影響に応じて重大度を選んでください。安全でない出力を黙って選ぶより、不確かさを報告するほうを優先します。error はビルドを止め、warning はビルドを完了させたうえで問題を示し、info はビルドの結果に影響しません。

## 関連用語
- [[plugin|Plugin]]
- [[glossary/diagnostics|Diagnostics]]
- [[diagnostic-code|Diagnostic code]]
- [[doctor|Doctor]]

## さらに詳しく
- [Diagnostics](../framework/diagnostics.ja.md)
