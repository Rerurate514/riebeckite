# @riebeckite/plugin-local-graph

Local（周辺 note）graph 描画: note の outgoing links と backlinks を
コンパクトな radial graph で表示します。

[English](./README_en.md)

## 概要

`localGraph()` は現在の note と直接 link された note を SVG の radial graph
で描画する `LocalGraph` component を提供します。`getLocalGraph()` は manifest
から note 型の outgoing links と backlinks を収集し、published な neighbor
だけを保持して、各方向を `MAX_NEIGHBORS_PER_DIRECTION`(10) 件に制限します。

node には relation が付きます:

- `current` — 選択中の note（中央）
- `outgoing` — 現在の note からの outgoing link
- `backlink` — 現在の note への backlink
- `both` — 双方向に link

published な neighbor が無い場合は何も描画しません。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { localGraphPlugin } from "@riebeckite/plugin-local-graph";

export default defineConfig({
  // ...
  plugins: [localGraphPlugin()],
});
```

`localGraphPlugin()` は plugin list に plugin を登録し、`style.css` を app の
stylesheet に bundle します。

### Component の描画

```tsx
import LocalGraph, { getLocalGraph } from "@riebeckite/plugin-local-graph";
import { config } from "../config";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const graph = getLocalGraph({
  manifest,
  config,
  slug,
  resolveTitle: getArticleTitle,
});

// route 内で
return (
  <Article
    footerContent={graph && <LocalGraph graph={graph} />}
  />
);
```

## Graph layout

node の位置は `layoutRadialGraph()` で計算します。中央の node は中心に、
neighbor は link 数に応じた radius で周囲に配置されます。edge は
`buildGraphEdges()` で構築します。header の link は `/explore?note=<slug>`
で full explorer を開きます。

## エクスポート

- `localGraphPlugin()` — plugin factory
- `LocalGraph` — SVG graph component（`components/local-graph.tsx` の
  default export）
- `getLocalGraph({ manifest, config, slug, resolveTitle })` — slug の周辺 note
  データを構築（note が無い・unpublished の場合は `null`）
- `buildGraphEdges(nodes, visibleSlugs?)` — 純粋な edge builder
- `layoutRadialGraph(nodes, options)` — 純粋な radial layout
- 型: `LocalGraphData`, `LocalGraphNode`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
- [`@riebeckite/plugin-backlinks`](../plugin-backlinks/README_ja.md)
- [`@riebeckite/plugin-garden-explorer`](../plugin-garden-explorer/README_ja.md)