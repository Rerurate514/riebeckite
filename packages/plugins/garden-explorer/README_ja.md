# @riebeckite/plugin-garden-explorer

ノート一覧、検索、タグ・フォルダーによる絞り込み、Local / Global Graph、詳細パネルを一画面にまとめる探索 UI です。公開済みのノートだけを対象にするため、そのまま公開サイトの `/explore` などに置けます。

[English](./README.md)

## 用意される画面

`gardenExplorerPlugin()` は、次の三つの領域を持つ `GardenExplorer` コンポーネントとスタイルを提供します。

- **一覧**: キーワード検索、任意表示のタグ・フォルダーフィルター、該当ノートの一覧
- **グラフ**: 公開ノートと内部リンクを表示する SVG グラフ。Local / Global の切り替え、force / radial layout、hover 時の隣接ノート強調、ノード drag、wheel / button zoom、canvas pan、reset、クリックで記事へ移動に対応
- **詳細**: 選択したノートのリンク、タグ、抜粋、関連ノート

選択状態は `?note=`、`?tag=`、`?folder=` として URL に反映されます。表示中の状態をそのまま共有できます。

`getGardenExplorerData()` は `manifest.discoverableEntries` と `manifest.graph` から表示データを作ります。見出し、本文テキストの先頭 4,000 文字、タグ、フォルダー、送信リンク、被リンクを含みます。Graph のノードは公開・発見可能なページと解決済み note link だけなので、未公開・除外・存在しないページは表示されません。

Explorer パネルのノート一覧は、UI 性能のため先頭 80 件に制限して表示します。Global Graph は絞り込み後の全ノートを使用します。URL で選択されたノートが先頭 80 件の外にある場合、Global Graph で保持されます。

## Local Graph と Global Graph

- **Local Graph** は選択中のノートを起点に、`depth` で指定した hop 数までの隣接ノートを表示します。既定値は `depth: 1` で、Obsidian / Quartz と同じく直接の outgoing link と backlink を見る用途に合わせています。`depth: 0` では選択中のノートだけを表示します。
- **Global Graph** は現在の検索・タグ・フォルダー条件で絞り込まれた公開ノート全体と、その公開内部リンクを表示します。

操作感は Obsidian の Graph View に寄せていますが、Vault をブラウザ側で再探索するのではなく、Riebeckite の Page System、public manifest、permalink、Content Graph をそのまま使います。

## Layout

- **Force layout**（`layout: "force"`、既定）: 小さな組み込み実装で repulsion、link distance、centering、damping、安定化を行います。重い依存は追加していません。大きなグラフ（300 ノード以上）では force layout の計算時間が目立つようになり、ツールバーに警告が表示されます。大きな Global Graph には radial layout の使用を推奨します。500 ノード以上では、ユーザーの明示的な承認なしに force layout は実行されません。
- **Radial layout**（`layout: "radial"`）: 既存の Riebeckite の放射状 layout を使います。コンパクトで決定的な見た目にしたい場合に使えます。近似線形時間で動作し、数千ノードでも瞬時に描画できます。

## 設定してページに配置する

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

`gardenExplorerPlugin()` は `/explore` の Page Type、スタイル、クライアント側の hydrator を登録します。`resolveRiebeckiteRoute()` と `pluginPageSsgParams()` を使う共通 catch-all route が表示と SSG を担当するため、Plugin 固有の route は不要です。ページはまずサーバーで描画し、読み込み後に登録済みの client entry がグラフ、フィルター、URL 状態を hydration します。

コンポーネントを別の site-owned component に埋め込む場合だけ、manifest から表示用データを作って渡します。

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

`GardenExplorer` はブラウザで操作するクライアントコンポーネントです。サーバー描画時にも周辺の一覧・詳細パネルは semantic なリンク一覧として読める構造を残します。

## データに含まれる範囲

`getGardenExplorerData()` は公開済みエントリーから、見出し、本文テキストの先頭 4,000 文字、タグ、フォルダー、送信リンク、被リンクを集めます。本文全体をクライアントへ渡さないため、検索用のデータ量を抑えられます。

- `notes`: タイトル順の公開ノート。フォルダー、送信リンク、被リンクを含む
- `edges`: 公開ノート間のグラフの辺
- `tags`: 件数の多い順のタグ
- `folders`: 名前順のフォルダー。ルート直下のノートは `Root`
- `options`: hydration 後の component が使う解決済み graph 設定

探索画面の検索はプラグイン内で完結しており、`@riebeckite/plugin-search` は不要です。

## 主なエクスポート

- `gardenExplorerPlugin(options?)`: プラグインを作成する
- `GardenExplorer`: 探索画面のコンポーネント
- `getGardenExplorerData({ manifest, config, resolveTitle, options? })`: 表示データを構築する
- 型: `GardenExplorerData`、`GardenExplorerEdge`、`GardenExplorerFolder`、`GardenExplorerGraphLayout`、`GardenExplorerGraphMode`、`GardenExplorerNote`、`GardenExplorerOptions`、`GardenExplorerPluginOptions`、`GardenExplorerTag`

## 関連資料

- [プラグインシステム](../../../docs/docs/reference/plugin-api.md)
- [`@riebeckite/plugin-local-graph`](../local-graph/README_ja.md)

