# @riebeckite/plugin-garden-explorer

ノートの一覧、検索、タグ・フォルダーによる絞り込み、リンクグラフを一画面にまとめる探索画面です。公開済みのノートだけを対象にするため、そのまま公開サイトの `/explore` などに置けます。

[English](./README.md)

## 用意される画面

`gardenExplorerPlugin()` は、次の三つの領域を持つ `GardenExplorer` コンポーネントとスタイルを提供します。

- **一覧**: キーワード検索、タグとフォルダーのフィルター、該当ノートの一覧
- **グラフ**: ノートと内部リンクを表示する放射状 SVG グラフ。ズーム、ドラッグ、リセットに対応
- **詳細**: 選択したノートのリンク、タグ、抜粋、関連ノート

選択状態は `?note=`、`?tag=`、`?folder=` として URL に反映されます。表示中の状態をそのまま共有できます。

## 設定してページに配置する

```ts
import { defineConfig } from "@riebeckite/core";
import { gardenExplorerPlugin } from "@riebeckite/plugin-garden-explorer";

export default defineConfig({
  // ...
  plugins: [gardenExplorerPlugin()],
});
```

`gardenExplorerPlugin()` は `/explore` の Page Type とスタイルを登録します。
`resolveRiebeckiteRoute()` と `pluginPageSsgParams()` を使う共通 catch-all route
が表示と SSG を担当するため、Plugin 固有の route は不要です。

コンポーネントを別の site-owned component に埋め込む場合だけ、manifest から
表示用データを作って渡します。

```tsx
import GardenExplorer, {
  getGardenExplorerData,
} from "@riebeckite/plugin-garden-explorer";

const manifest = await content.getManifest();
const data = getGardenExplorerData({
  manifest,
  config,
  resolveTitle: getArticleTitle,
});

return <GardenExplorer data={data} />;
```

`GardenExplorer` はブラウザで操作するクライアントコンポーネントです。サーバーで描画するだけの場所には置かず、クライアント側で動作するルートに配置してください。

## データに含まれる範囲

`getGardenExplorerData()` は公開済みエントリーから、見出し、本文テキストの先頭 4,000 文字、タグ、フォルダー、送信リンク、被リンクを集めます。本文全体をクライアントへ渡さないため、検索用のデータ量を抑えられます。

- `notes`: タイトル順の公開ノート。フォルダー、送信リンク、被リンクを含む
- `edges`: 公開ノート間のグラフの辺
- `tags`: 件数の多い順のタグ
- `folders`: 名前順のフォルダー。ルート直下のノートは `Root`

探索画面の検索はプラグイン内で完結しており、`@riebeckite/plugin-search` は不要です。

## 主なエクスポート

- `gardenExplorerPlugin()`: プラグインを作成する
- `GardenExplorer`: 探索画面のコンポーネント
- `getGardenExplorerData({ manifest, config, resolveTitle })`: 表示データを構築する
- 型: `GardenExplorerData`、`GardenExplorerEdge`、`GardenExplorerFolder`、`GardenExplorerNote`、`GardenExplorerTag`

## 関連資料

- [プラグインシステム](../../../docs/ja/reference/plugin-api.md)
- [`@riebeckite/plugin-local-graph`](../local-graph/README_ja.md)
