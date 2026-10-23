---
date: 2026-10-14
title: レンダラー（Renderer）
sidebar:
  hidden: true
---

# レンダラー（Renderer）
レンダラーはコンテンツの対象をプラグイン固有のHTMLに変換します。対象を処理しない場合は `null` を返し、別のレンダラーに処理を渡します。Canvas、Excalidraw、添付ファイルの描画が例です。

## レンダラーの契約
レンダラーは `kind`、`path`、`raw`、`label`、`url`、`embed` を持つ対象と、標準の `PluginContext` を受け取ります。対象を処理しない場合は `null` を返し、次のレンダラーが試されるようにします。

## レンダラーの型
`PluginContentRenderer` 型がレンダラーの契約を定義します。

```ts
type PluginContentRenderer = {
  kind: string;
  handle(
    target: { kind: string; path: string; raw: string; label: string; url: string; embed?: string },
    context: PluginContext,
  ): string | null;
};
```

各レンダラーは `kind` 文字列（例：`"canvas"`、`"excalidraw"`、`"attachment"`、`"media"`）を宣言します。フレームワークは `kind` で対象をレンダラーに照合し、プラグインは異なるコンテンツ種別用に複数のレンダラーを登録できます。

## 例
組み込みのレンダラーには、canvas（Excalidraw）、添付ファイル、mediaがあります。Basesやサードパーティの図ライブラリなどの形式向けに、プラグインごとに独自のレンダラーを定義できます。

## 関連用語
- [[plugin|Plugin]]
- [[content-hook|Content hook]]
- [[island|Island]]
- [[asset|Asset]]
- [[endpoint|Endpoint]]

## さらに詳しく
- [Plugin API](../reference/plugin-api.ja.md)
