---
date: 2026-10-14
title: Orphan
sidebar:
  hidden: true
---

# Orphan

どのページからもリンクされていないコンテンツです。診断は既定でオフになっており、有効にすると孤立したentryを報告します。

## 検出

`diagnostics`の設定で孤立したコンテンツの報告を有効にします。一覧やfeedからたどれないページを、Buildを止めずに知らせます。

## diagnosticによるorphanの検出

孤立したコンテンツの検出はdiagnostics設定で有効にできます。有効にすると、Buildを停止せずに孤立したentryがレポートされます。diagnosticsプラグインはcontent graphの到達可能性をチェックします。他のコンテンツからリンクされておらず、manifestにリストされていないコンテンツはorphanとしてフラグが立てられます。

### 例

```sh
# orphan レポートの出力例（diagnostics 有効時）
# 孤立したnoteが3件検出されました：
#   - note-404 (リンクなし、manifest 未記録)
#   - note-draft (draftフォルダでのみリンク、publish 除外)
# 到達不可能なentryを確認するには `inspect content --list` を使用してください
```
## 関連用語

- [[unused-asset|Unused Asset]]
- [[glossary/content|Content]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Diagnostics](../framework/diagnostics.ja.md)
