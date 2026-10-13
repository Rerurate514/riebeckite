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

## Capability system (`provides`/`requires`/`optional`)

Pluginは`provides`、`requires`、`optional`でCapabilityを宣言し、依存関係を解決したパイプラインに加わります。`resolvePlugins`関数はプラグインを`order`フィールドの順序で処理し、その後、依存関係を解決してcapabilityを提供するプラグインを必要とするプラグインより前に配置します。提供者が見つからない場合、診断と共に解決に失敗します。

```ts
definePlugin({
  name: "example",
  provides: ["content.graph"],
  requires: ["cache"],
  optional: ["example.optional"],
})
```

- **`provides`**: パイプラインが提供する能力。能力は正確に1つの有効なプロバイダを持たなければなりません；重複するプロバイダは解決失敗となります。
- **`requires`**: このプラグインが依存する能力。各プロバイダがこのプラグインの前に順序付けられ、提供者がない場合は診断と共に失敗します。
- **`optional`**: 利用可能な場合に使用する能力。提供者がないことは無視され、提供者がpresentならばこのプラグインの前に順序付けられます。

`getResolvedPluginMetadata`ユーティリティは、各プラグインの解決されたprovides/requires/optionalを`ResolvedPluginMetadata`として公開し、pipelineは順序決定と診断に使用します。

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
