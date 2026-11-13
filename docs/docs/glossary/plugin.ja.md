---
date: 2026-10-14
title: プラグイン（Plugin）
sidebar:
  hidden: true
---

# プラグイン（Plugin）

Riebeckite のプラグインは、定められた契約を通じて、コンテンツの解釈、変換、描画、診断、ビルド時の処理、エンドポイント、ブラウザでの動作を拡張します。

## 拡張ポイント

プラグインは `provides`、`requires`、`optional` でケイパビリティを宣言し、依存関係を解決したパイプラインに加わります。

```ts
definePlugin({
  name: "example",
  provides: ["content.graph"],
  requires: ["cache"],
  optional: ["example.optional"],
});
```

Core の拡張ポイントには、remark/rehype パイプライン、コンテンツフック、レンダラー、ページ種別、アセット、クライアントエントリ、エンドポイント、診断があります。

## ライフサイクル

フックは解決済みのプラグイン順に実行されます。`setup`、`buildStart`、コンテンツ処理、`buildEnd`、`dispose`（逆順）です。

名前付きフック（`onConfigResolved`、`onContentLoaded`、`onPostParsed`、`onPostProcessed`、`onManifestCreated`）はコンテンツの各段階に参加します。

## ケイパビリティシステム（`provides`/`requires`/`optional`）

プラグインは `provides`、`requires`、`optional` でケイパビリティを宣言し、依存関係を解決したパイプラインに加わります。`resolvePlugins` 関数はプラグインを `order` フィールドの順に処理し、続いて依存関係を解決して、ケイパビリティを提供するプラグインを、それを必要とするプラグインより前に並べます。必須のケイパビリティに提供者が存在しない場合、解決は `PluginDependencyError` を投げて失敗します。

```ts
definePlugin({
  name: "example",
  provides: ["content.graph"],
  requires: ["cache"],
  optional: ["example.optional"],
})
```

- **`provides`**：このプラグインがパイプラインに提供するケイパビリティ。ケイパビリティには有効な提供者がちょうど1つ必要で、重複する提供者は解決失敗になります。
- **`requires`**：このプラグインが依存するケイパビリティ。解決は各提供者をこのプラグインより前に並べ、提供者がいない場合は `PluginDependencyError` を投げます。
- **`optional`**：利用可能なら使うケイパビリティ。提供者がいなくても無視され、存在する提供者はこのプラグインより前に並べられます。

`getResolvedPluginMetadata` ユーティリティは、各プラグインの解決済みの provides/requires/optional を `ResolvedPluginMetadata` として公開し、パイプラインが順序決定と診断に使います。

## アセット、コンポーネント、クライアントエントリ

CSS は `assets` で宣言します。Markdown から配置する自己完結した UI は `markdownComponents` で宣言し、ブラウザ側の状態が必要なら `client` モジュールを指定します。任意のブラウザ初期化は `clientEntries` で宣言します。ブラウザ向け JavaScript は本当に必要な場合だけ宣言してください。

```ts
assets: [createStyleAsset("example", "@example/plugin/style.css")],
clientEntries: [
  createClientEntry("example", {
    moduleSpecifier: "@example/plugin/client",
    exportName: "init",
    publicConfig: { selector: ".example" },
  }),
],
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
- [[asset|Asset]]
- [[glossary/diagnostics|Diagnostics]]
- [[diagnostic-code|Diagnostic code]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Plugin System](../framework/plugin-system.ja.md)
