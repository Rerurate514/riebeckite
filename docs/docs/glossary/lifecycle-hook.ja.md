---
title: Lifecycle hook
sidebar:
  hidden: true
---

# Lifecycle hook

Pluginのlifecycle hookは、Content Managerが1回動く間に`setup`、`buildStart`、コンテンツ処理、`buildEnd`、そして逆順の`dispose`の順で実行されます。名前付きのcontent hookは、依存関係を解決したPluginの順序で加わります。

## ビルドライフサイクル

フレームワークは1回のContent Managerにつき`setup`、`buildStart`、`onConfigResolved`、コンテンツ処理、`buildEnd`を実行します。`buildEnd`はdiagnosticを集めた後の完成したmanifestを受け取る最後のhookです。

```mermaid
flowchart LR
  Setup["setup"]
  Start["buildStart"]
  Work["Build / Content Processing"]
  End["buildEnd"]
  Dispose["dispose"]
  Setup --> Start
  Start --> Work
  Work --> End
  End --> Dispose
```

## 名前付きコンテンツフック

content hook（`onConfigResolved`、`onContentLoaded`、`onPostParsed`、`onPostProcessed`、`onManifestCreated`）は、依存関係を解決したPluginの順序で実行されます。hookが失敗すると、`PluginHookError`がPlugin、hook名、原因を示して報告します。

## 関連用語

- [[plugin|Plugin]]
- [[plugin-cache|Plugin cache]]
- [[content-hook|Content hook]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Plugin Lifecycle](../framework/plugin-system/lifecycle.ja.md)
- [Plugin API](../reference/plugin-api.ja.md)
