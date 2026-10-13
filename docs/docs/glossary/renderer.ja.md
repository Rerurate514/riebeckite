---
title: Renderer
sidebar:
  hidden: true
---

# Renderer

Rendererはコンテンツの対象をPlugin固有のHTMLに変換します。対象を処理しない場合は`null`を返し、次のRendererに処理を渡します。Canvas、Excalidraw、attachmentの描画が例です。

## Rendererの契約

Rendererは`kind`、`path`、`raw`、`label`、`url`、`embed`を含む対象と、標準の`PluginContext`を受け取ります。対象を処理しない場合は`null`を返し、次のRendererが試せるようにします。

## 例

組み込みのRendererにはcanvas（Excalidraw）、attachment、mediaがあります。カスタムRendererはPluginで定義でき、Basesやサードパーティの図形式にも対応できます。

## 関連用語

- [[plugin|Plugin]]
- [[content-hook|Content hook]]
- [[island|Island]]
- [[asset|Asset]]
- [[endpoint|Endpoint]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
