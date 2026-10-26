---
date: 2026-10-08
title: Local Graph
---
# Local Graph

現在のノートと、そこから直接つながるノート（リンク先と被リンク元）を小さな放射状グラフで表示するプラグインです。

[English](./local-graph.md)

## 実行例

[Backlink](/ja/docs/glossary/backlink) を開くと、そのページと隣接ページを中心としたローカルグラフが記事の末尾に表示されます。

## 推奨配置

`getLocalGraph()` はマニフェストからリンク先と被リンク元を集め、公開済みノートだけを残します。リンク先と被リンク元はそれぞれ最大 10 件です。`LocalGraph` はそのデータを SVG として描画し、周辺ノートがなければ何も表示しません。Site は `<LocalGraph />` コンポーネントを記事の後などに配置します。

## クイックスタート

```ts
import { defineConfig } from "@riebeckite/core";
import { localGraph } from "@riebeckite/plugin-local-graph";

export default defineConfig({ plugins: [localGraph()] });
```

記事レイアウトで `<LocalGraph />` コンポーネントを一度描画します。

## 設定

`localGraph()` にはプラグイン用のオプションがありません。`LocalGraph` コンポーネントは必須プロップ `graph` を受け取ります。

## 高度なカスタマイズ

サイト側で配置を決めるには、`getLocalGraph` を使ってデータを取得し、`<LocalGraph graph={...} />` コンポーネントを一度だけ描画してください。グラフの生成と、公開済みの近傍だけを残す絞り込みは維持されます。

```tsx
import LocalGraph, { getLocalGraph } from "@riebeckite/plugin-local-graph";
const graph = getLocalGraph({ manifest: await content.getManifest(), config, slug, resolveTitle });
return <aside>{graph ? <LocalGraph graph={graph} /> : null}</aside>;
```

グラフのノード位置は `layoutRadialGraph()`、辺は `buildGraphEdges()` が計算します。各ノードのリンクは解決済みの `permalink` を使い、ヘッダーは内部セレクションキー `/explore?note=<slug>` で Explorer を開きます。

## 公開 API

- `localGraph()`、`LocalGraph`
- `getLocalGraph({ manifest, config, slug, resolveTitle })`
- `buildGraphEdges(nodes, visibleSlugs?)`、`layoutRadialGraph(nodes, options)`
- `LocalGraphData`、`LocalGraphNode`

## 関連資料

- [[plugin-api|プラグインシステム]]
- [`@riebeckite/plugin-backlinks`](./backlinks.ja.md)
- [`@riebeckite/plugin-garden-explorer`](./garden-explorer.ja.md)