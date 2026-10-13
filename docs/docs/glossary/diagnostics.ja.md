---
title: Diagnostics
sidebar:
  hidden: true
---

# Diagnostics

DiagnosticsはCoreとPluginが出す構造化された調査結果で、何が問題か、どこで起きるか、どれくらい重要か（severity）、どう直すかを示します。Pluginは`addDiagnostics`で診断を報告し、Coreは`check`と`doctor`コマンドでまとめます。

## 診断の構造

診断は、何が問題か、どこで起きるか、どれくらい重要か（severity）、どう直すかを説明します。`check`は設定とPluginの妥当性に、`doctor`はより広い健全性に使います。

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
- [[build|Build]]

## さらに詳しく

- [Diagnostics](../framework/diagnostics.ja.md)
