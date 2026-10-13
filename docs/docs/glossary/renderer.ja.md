---
title: Renderer
sidebar:
  hidden: true
---

# Renderer

Renderer はコンテンツターゲットをプラグイン固有の HTML に変換します; ターゲットを処理しない場合は `null` を返して次の renderer が参加できるようにします。Canvas、Excalidraw、attachment の描画が例です。

## Renderer 契約

Renderer は `kind`、`path`、`raw`、`label`、`url`、`embed` を含むターゲットと標準の `PluginContext` を受け取ります。ターゲットを処理しない場合は `null` を返して次の renderer が試せるようにします。

## 例

組み込みの renderer には: canvas (Excalidraw)、attachment、media があります。カスタム renderer はプラグインで Bases やサードパーティの図書館形式のために定義できます。

## 関連用語

- [[plugin|Plugin]]
- [[content-hook|Content hook]]
- [[island|Island]]
- [[asset|Asset]]
- [[endpoint|Endpoint]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
