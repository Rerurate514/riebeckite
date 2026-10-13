---
title: Plugin
sidebar:
  hidden: true
---

# Plugin

Riebeckite でプラグインは定義された契約を通じてコンテンツの解釈、変換、描画、診断、ビルド時処理、エンドポイント、ブラウザ動作を拡張します。

## 拡張ポイント

プラグインは `provides`、`requires`、`optional` でキャビリティを宣言し、依存解決済みのパイプラインに参加します。

```ts
definePlugin({
  name: "example",
  provides: ["content.graph"],
  requires: ["cache"],
  optional: ["example.optional"],
});
```

Core の拡張ポイントには remark/rehype パイプライン、コンテンツフック、renderers、page types、assets、client entries、endpoints、diagnostics があります。

## ライフサイクル

hook は resolved plugin order で実行されます: `setup`, `buildStart`, コンテンツ処理、`buildEnd`, そして `dispose` (逆順)。

名前付きフック (`onConfigResolved`, `onContentLoaded`, `onPostParsed`, `onPostProcessed`, `onManifestCreated`) はコンテンツのフェーズに参加します。

## assets と client entries

CSS は `assets` で宣言、ブラウザの JavaScript は `clientEntries` で宣言。本当に必要な場合だけ宣言します。

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
