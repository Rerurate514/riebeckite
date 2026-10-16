# @riebeckite/plugin-local-graph

<!-- Generated from docs/docs/plugins/local-graph.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

現在のノートと、その前後につながるノートを小さな放射状グラフで表示するプラグインです。

[English](./README.md)

## 推奨配置

`getLocalGraph()` はマニフェストからリンク先と被リンク元を集め、公開済みノートだけを残します。各方向は最大 10 件です。`LocalGraph` はそのデータを SVG として描画し、周辺ノートがなければ何も表示しません。Site は `<LocalGraph />` コンポーネントを記事の後などに配置します。

## クイックスタート

```ts
import { defineConfig } from "@riebeckite/core";
import { localGraphPlugin } from "@riebeckite/plugin-local-graph";

export default defineConfig({ plugins: [localGraphPlugin()] });
```

記事レイアウトで `<LocalGraph />` コンポーネントを一度描画します。

## 設定

`localGraphPlugin()` にはプラグイン用のオプションがありません。`LocalGraph` コンポーネントは `graph` 必須プロップを受け取ります。

## 高度なカスタマイズ

サイト側で配置を決めるには、`getLocalGraph` を使ってデータを取得し、`<LocalGraph graph={...} />` コンポーネントを一度だけ描画してください。グラフの生成と公開済み近傍だけを残すフィルタリングは維持されます。

```tsx
import LocalGraph, { getLocalGraph } from "@riebeckite/plugin-local-graph";
const graph = getLocalGraph({ manifest: await content.getManifest(), config, slug, resolveTitle });
return <Article footerContent={graph && <LocalGraph graph={graph} />} />;
```

グラフのノード位置は `layoutRadialGraph()`、辺は `buildGraphEdges()` が計算します。各ノードのリンクは解決済みの `permalink` を使い、見出しは internal selection key `/explore?note=<slug>` で Explorer を開きます。

## 公開 API

- `localGraphPlugin()`、`LocalGraph`
- `getLocalGraph({ manifest, config, slug, resolveTitle })`
- `buildGraphEdges(nodes, visibleSlugs?)`、`layoutRadialGraph(nodes, options)`
- `LocalGraphData`、`LocalGraphNode`

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
- [`@riebeckite/plugin-backlinks`](../backlinks/README_ja.md)
- [`@riebeckite/plugin-garden-explorer`](../garden-explorer/README_ja.md)
