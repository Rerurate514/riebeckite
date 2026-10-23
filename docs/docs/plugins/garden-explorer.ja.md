---
date: 2026-10-08
title: Garden Explorer
---
# Garden Explorer

ノート一覧、検索、タグ・フォルダーによる絞り込み、Local / Global Graph、詳細パネルを一画面にまとめる探索 UI です。公開済みのノートだけを対象にするため、そのまま公開サイトの `/explore` などに置けます。

[English](./garden-explorer.md)

## 用意される画面

`gardenExplorerPlugin()` は、次の三つの領域を持つ `GardenExplorer` コンポーネントとスタイルを提供します。

- **一覧**: キーワード検索、任意表示のタグ・フォルダーフィルター、該当ノートの一覧
- **グラフ**: 公開ノートと内部リンクを表示する SVG グラフ。Local / Global の切り替え、Force / Radial レイアウト、ホバー時の隣接ノート強調、ノードのドラッグ、ホイール / ボタンによるズームに対応します。キャンバスのパン、リセット、クリックでの記事移動にも対応します
- **詳細**: 選択したノートのリンク、タグ、抜粋、関連ノート

選択状態は `?note=`、`?tag=`、`?folder=` として URL に反映されます。表示中の状態をそのまま共有できます。

`getGardenExplorerData()` は `manifest.discoverableEntries` と `manifest.graph` から表示データを作ります。見出し、本文テキストの先頭 4,000 文字、タグ、フォルダー、外向きリンク、被リンクを含みます。グラフのノードは公開・発見可能なページと解決済みのノートリンクだけなので、未公開・除外・存在しないページは表示されません。

一覧パネルに表示するノートは、UI 性能のため先頭 80 件に制限します。Global Graph は絞り込み後の全ノートを使用します。URL で選択されたノートが先頭 80 件の外にある場合、Global Graph で保持されます。

## Local Graph と Global Graph

- **Local Graph** は選択中のノートを起点に、`depth` で指定したホップ数までの隣接ノートを表示します。既定値は `depth: 1` で、Obsidian / Quartz と同じく直接の外向きリンクと被リンクを見る用途に合わせています。`depth: 0` では選択中のノートだけを表示します。
- **Global Graph** は現在の検索・タグ・フォルダー条件で絞り込まれた公開ノート全体と、その公開内部リンクを表示します。

操作感は Obsidian の Graph View に寄せています。ただし、ブラウザで Vault を走査し直すことはありません。代わりに、Riebeckite の Page System、公開マニフェスト、パーマリンク、Content Graph をそのまま使います。

## レイアウト

- **Force レイアウト**（`layout: "force"`、既定）: 小さな組み込み実装です。反発力、リンク距離、中心化、減衰、安定化を計算します。重い依存は追加していません。大きなグラフ（300 ノード以上）では Force レイアウトの計算時間が目立つようになり、ツールバーに警告が表示されます。大きな Global Graph には Radial レイアウトの使用を推奨します。500 ノード以上では、ユーザーの明示的な承認なしに Force レイアウトは実行されません。
- **Radial レイアウト**（`layout: "radial"`）: 既存の Riebeckite の放射状レイアウトを使います。コンパクトで決定的な見た目にしたい場合に使えます。近似線形時間で動作し、数千ノードでも瞬時に描画できます。

## 設定とページへの配置

```ts
import { defineConfig } from "@riebeckite/core";
import { gardenExplorerPlugin } from "@riebeckite/plugin-garden-explorer";

export default defineConfig({
  // ...
  plugins: [gardenExplorerPlugin()],
});
```

設定例は次のとおりです。

```ts
plugins: [
  gardenExplorerPlugin({
    layout: "force",
    depth: 1,
    showTags: true,
    showFolders: false,
    nodeSize: 1,
    linkDistance: 84,
    repulsion: 1800,
    showLabels: true,
  }),
];
```

`gardenExplorerPlugin()` は `/explore` の Page Type、スタイル、クライアント側のハイドレーターを登録します。`resolveRiebeckiteRoute()` と `pluginPageSsgParams()` を使う共通 catch-all ルートが表示と SSG を担当します。そのため、プラグイン固有のルートは不要です。ページはまずサーバーで描画し、読み込み後に登録済みのクライアントエントリがグラフ、フィルター、URL 状態をハイドレーションします。

コンポーネントを別のサイトが用意するコンポーネントに埋め込む場合だけ、マニフェストから表示用データを作って渡します。

```tsx
import GardenExplorer, {
  getGardenExplorerData,
} from "@riebeckite/plugin-garden-explorer";

const manifest = await content.getManifest();
const data = getGardenExplorerData({
  manifest,
  config,
  resolveTitle: getArticleTitle,
  options: { layout: "radial", depth: 2 },
});

return <GardenExplorer data={data} />;
```

`GardenExplorer` はブラウザで操作するクライアントコンポーネントです。サーバー描画時にも、周辺の一覧・詳細パネルはセマンティックなリンク一覧として読み取れる構造を残します。

## データに含まれる範囲

`getGardenExplorerData()` は公開済みエントリーから、見出し、本文テキストの先頭 4,000 文字、タグ、フォルダー、外向きリンク、被リンクを集めます。本文全体をクライアントへ渡さないため、検索用のデータ量を抑えられます。

- `notes`: タイトル順の公開ノート。フォルダー、外向きリンク、被リンクを含む
- `edges`: 公開ノート間のグラフの辺
- `tags`: 件数の多い順のタグ
- `folders`: 名前順のフォルダー。ルート直下のノートは `Root`
- `options`: ハイドレーション後のコンポーネントが使う解決済みグラフ設定

探索画面の検索はプラグイン内で完結しており、`@riebeckite/plugin-search` は不要です。

## 主なエクスポート

- `gardenExplorerPlugin(options?)`: プラグインを作成する
- `GardenExplorer`: 探索画面のコンポーネント
- `getGardenExplorerData({ manifest, config, resolveTitle, options? })`: 表示データを構築する
- 型: `GardenExplorerData`、`GardenExplorerEdge`、`GardenExplorerFolder`、`GardenExplorerGraphLayout`、`GardenExplorerGraphMode`、`GardenExplorerNote`、`GardenExplorerOptions`、`GardenExplorerPluginOptions`、`GardenExplorerTag`

## 関連資料

- [[plugin-api|プラグインシステム]]
- [`@riebeckite/plugin-local-graph`](./local-graph.ja.md)
