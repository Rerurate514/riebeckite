---
date: 2026-10-14
title: 診断（Diagnostics）
sidebar.hidden: true
---

# 診断（Diagnostics）
診断は Core とプラグインが出力する構造化された検出結果で、何が問題か、どこで起きるか、どれくらい重要か、どう直すかを示します。プラグインは `addDiagnostics` で診断を報告し、`doctor` と Development Inspector がそれらを集めます。`check` は設定と API ライフサイクルの診断を報告します。

## 診断の構造
診断は、何が問題か、どこで起きるか、どれくらい重要か、どう直すかを表します。設定とプラグインの妥当性には `check`、より広い健全性には `doctor` を使います。

## 報告
```ts
addDiagnostics(context) {
  return [
    {
      code: "duplicate-content-id",
      severity: "error",
      message: "Multiple articles share the same content ID",
    },
  ];
}
```

## 診断のフィールド
- `code`：安定した診断コード（[[diagnostic-code|Diagnostic code]]参照）
- `severity`：`error`、`warning`、`info` のいずれか
- `message`：問題を人間が読める形で説明したもの
- `pluginName`、`filePath`、`slug`、`line`、`column`、`target`、`suggestion`、`meta`：任意のコンテキストフィールド

## 関連用語
- [[diagnostic-code|Diagnostic code]]
- [[plugin|Plugin]]
- [[glossary/inspector|Inspector]]
- [[build|Build]]

## さらに詳しく
- [Diagnostics](../framework/diagnostics.ja.md)
