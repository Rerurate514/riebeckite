# @riebeckite/plugin-garden-explorer

インタラクティブな note garden explorer: 1 ページで graph・検索・tag/folder
filter・note details をまとめて提供します。

[English](./README_en.md)

## 概要

`gardenExplorer()` は 3 つの panel を持つインタラクティブな
`GardenExplorer` component を提供します。

- **Explorer** — 検索 box と tag / folder の filter chip（count 付き）、
  絞り込み後の note list
- **Graph** — note と内部 link のインタラクティブな radial SVG graph。
  zoom（`+`/`−`/wheel）・pan（drag）・reset 対応
- **Details** — 選択中の note の link・tag・excerpt・related notes

選択状態は URL query に反映されるため（`?note=`、`?tag=`、`?folder=`）、
表示を共有でき、現在の選択に応じて filter list が変わります。

`getGardenExplorerData()` は published entries から headings・plain text body
（4,000 文字に truncated）・tags・folders・outgoing links・backlinks を含む
note 集合を構築します。検索には `@riebeckite/plugin-search` の engine
（`searchItems`）を、radial layout には `../src/graph.ts` を再利用します。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { gardenExplorerPlugin } from "@riebeckite/plugin-garden-explorer";

export default defineConfig({
  // ...
  plugins: [gardenExplorerPlugin()],
});
```

`gardenExplorerPlugin()` は plugin list に plugin を登録し、`style.css` を
app の stylesheet に bundle します。

### Component の描画

```tsx
import GardenExplorer, {
  getGardenExplorerData,
} from "@riebeckite/plugin-garden-explorer";
import { config } from "../config";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const data = getGardenExplorerData({
  manifest,
  config,
  resolveTitle: getArticleTitle,
});

// /explore route 内で
return <GardenExplorer data={data} />;
```

この component は client 側でインタラクティブに動作し、browser で
`window` が利用可能であることを前提とします。

## データ

`getGardenExplorerData()` は `GardenExplorerData` を返します。

- `notes` — title 順に sort された published notes。各 note は `folder`・
  `outgoing`・`backlinks` を持つ `SearchItem`
- `edges` — published notes 間の graph edge
- `tags` — tag の count（多い順）
- `folders` — folder の count（アルファベット順）。root 直下の note は
  `"Root"` になります

## エクスポート

- `gardenExplorerPlugin()` — plugin factory
- `GardenExplorer` — インタラクティブな explorer component
  （`components/garden-explorer.tsx` の default export）
- `getGardenExplorerData({ manifest, config, resolveTitle })` — explorer の
  dataset を構築
- 型: `GardenExplorerData`, `GardenExplorerEdge`, `GardenExplorerFolder`,
  `GardenExplorerNote`, `GardenExplorerTag`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
- [`@riebeckite/plugin-search`](../plugin-search/README_ja.md)
- [`@riebeckite/plugin-local-graph`](../plugin-local-graph/README_ja.md)