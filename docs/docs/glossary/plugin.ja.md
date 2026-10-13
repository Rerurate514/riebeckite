---
title: Plugin
sidebar:
  hidden: true
---

# Plugin

RiebeckiteのPluginは、定義された契約を通してコンテンツの解釈、変換、描画、診断、ビルド時の処理、エンドポイント、ブラウザでの動作を拡張します。

## 拡張ポイント

Pluginは`provides`、`requires`、`optional`でCapabilityを宣言し、依存関係を解決したパイプラインに加わります。

```ts
definePlugin({
  name: "example",
  provides: ["content.graph"],
  requires: ["cache"],
  optional: ["example.optional"],
});
```

Coreの拡張ポイントにはremark/rehypeパイプライン、コンテンツhook、renderer、page type、asset、client entry、endpoint、diagnosticがあります。

## ライフサイクル

hookは依存関係を解決したPluginの順序で実行されます。`setup`、`buildStart`、コンテンツ処理、`buildEnd`、そして`dispose`（逆順）です。

名前付きのhook（`onConfigResolved`、`onContentLoaded`、`onPostParsed`、`onPostProcessed`、`onManifestCreated`）はコンテンツの各段階に加わります。

## Assetとclient entry

CSSは`assets`、ブラウザで動くJavaScriptは`clientEntries`で宣言します。宣言するのは本当に必要な場合だけにしてください。

```ts
assets: [createStyleAsset("example")],
clientEntries: [createClientEntry("example", "init", { selector: ".example" })],
```

## 関連用語

- [[plugin-cache|Plugin cache]]
- [[plugin-dependency|Plugin dependency]]
- [[lifecycle-hook|Lifecycle hook]]
- [[content-hook|Content hook]]
- [[renderer|Renderer]]
- [[endpoint|Endpoint]]
- [[client-entry|Client entry]]
- [[island|Island]]
- [[slot|Body slot]]
- [[asset|Asset]]
- [[glossary/diagnostics|Diagnostics]]
- [[diagnostic-code|Diagnostic code]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Plugin System](../framework/plugin-system.ja.md)
