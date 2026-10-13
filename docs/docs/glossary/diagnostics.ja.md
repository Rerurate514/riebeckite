---
title: Diagnostics
sidebar:
  hidden: true
---

# Diagnostics

Diagnostics は Core と plugin が emitting 構造化された調査結果で、問題が何か、どこで起きるか、どの程度重要か (severity)、そしてどう修正するかを説明します。プラグインは `addDiagnostics` で診断を報告し、Core は `check` と `doctor` コマンドでまとめます。

## 診断の構造

診断は: `what` 問題か、`where` 起きるか、`how important` か (severity)、そして `how to fix` 修正方法を説明します。`check` は設定/plugin の妥当性に、`doctor` はより広範な健全性のために使用します。

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

## 関連用語

- [[diagnostic-code|Diagnostic code]]
- [[plugin|Plugin]]
- [[glossary/inspector|Inspector]]
- [[build|ビルド]]

## さらに詳しく

- [Diagnostics](../framework/diagnostics.ja.md)
