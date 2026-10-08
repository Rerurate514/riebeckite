<!-- Generated from packages/plugins/local-graph/README_ja.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Local Graph

現在のノートと、その前後につながるノートを小さな放射状グラフで表示するプラグインです。

[English](./local-graph.md)

## できること

`getLocalGraph()` はマニフェストからリンク先と被リンク元を集め、公開済みノートだけを残します。各方向は最大 10 件です。`LocalGraph` はそのデータを SVG として描画し、周辺ノートがなければ何も表示しません。

ノードには `current`、`outgoing`、`backlink`、`both` の関係が付きます。中央が現在のノート、周囲が直接つながるノートです。

## 設定と配置

```ts
import { defineConfig } from "@riebeckite/core";
import { localGraphPlugin } from "@riebeckite/plugin-local-graph";

export default defineConfig({ plugins: [localGraphPlugin()] });
```

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

- [プラグインシステム](../reference/plugin-api.ja.md)
- [`@riebeckite/plugin-backlinks`](./backlinks.ja.md)
- [`@riebeckite/plugin-garden-explorer`](./garden-explorer.ja.md)
