---
date: 2026-10-14
title: 診断（Diagnostics）
sidebar:
  hidden: true
---

# 診断（Diagnostics）
診断はCoreとプラグインが出力する構造化された検出結果で、何が問題か、どこで起きるか、どれくらい重要か、どう直すかを示します。プラグインは`addDiagnostics`で診断を報告し、Coreが`check`と`doctor`コマンド用にまとめます。

## 診断の構造
診断は、何が問題か（what）、どこで起きるか（where）、どれくらい重要か（severity）、どう直すか（how to fix）を表します。設定とプラグインの妥当性には`check`、より広い健全性には`doctor`を使います。

## 報告
```ts
addDiagnostics(context) {
  return [
    {
      id: "duplicate-content-id",
      severity: "error",
      message: "Multiple articles share the same content ID",
    },
  ];
}
```

## 診断のフィールド
- `id`：安定した診断コード（[[diagnostic-code|Diagnostic code]]参照）
- `severity`：`error`、`warn`、`info`のいずれか
- `message`：問題を人間が読める形で説明したもの
- `cause`：診断の原因となった元のエラー（任意）

## 関連用語
- [[diagnostic-code|Diagnostic code]]
- [[plugin|Plugin]]
- [[glossary/inspector|Inspector]]
- [[build|Build]]

## さらに詳しく
- [Diagnostics](../framework/diagnostics.ja.md)
