---
date: 2026-10-14
title: Renderer
sidebar:
  hidden: true
---

# Renderer
Rendererはコンテンツの対象をPlugin固有のHTMLに変換します。対象を処理しない場合は`null`を返し、次のRendererに処理を渡します。Canvas、Excalidraw、attachmentの描画が例です。

## Rendererの取り決め
Rendererは`kind`、`path`、`raw`、`label`、`url`、`embed`を含む対象と、標準の`PluginContext`を受け取ります。対象を処理しない場合は`null`を返し、次のRendererが試せるようにします。

## Rendererタイプ
`PluginContentRenderer`型はRendererの取り決めを定義します：

```ts
type PluginContentRenderer = {
  kind: string;
  handle(
    target: { kind: string; path: string; raw: string; label: string; url: string; embed?: string },
    context: PluginContext,
  ): string | null;
};
```

各Rendererは`kind`文字列（例：「canvas」、「excalidraw」、「attachment」、「media」）を宣言します。フレームワークは`kind`でターゲットをRendererにマッチングし、Pluginは複数のRendererを異なるコンテンツ種別用に登録できます。

## 例
組み込みのRendererにはcanvas（Excalidraw）、attachment、mediaがあります。Pluginで独自のRendererを定義し、Basesやサードパーティの図形式にも対応できます。

## 関連用語
- [[plugin|Plugin]]
- [[content-hook|Content hook]]
- [[island|Island]]
- [[asset|Asset]]
- [[endpoint|Endpoint]]

## さらに詳しく
- [Plugin API](../reference/plugin-api.ja.md)