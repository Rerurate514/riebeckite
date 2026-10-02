# Garden Explorer

Digital Garden を探索するための独立ページを提供します。検索できるノート一覧、タグ・フォルダー絞り込み、Local / Global Graph、詳細パネルを一画面にまとめます。

## 導入

```bash
npm install @riebeckite/plugin-garden-explorer
```

`riebeckite.config.ts` に登録します。

```ts
import { gardenExplorerPlugin } from "@riebeckite/plugin-garden-explorer";

export default defineConfig({
  plugins: [
    gardenExplorerPlugin({
      layout: "force",
      depth: 1,
      showTags: true,
      showFolders: true,
    }),
  ],
});
```

## 提供されるもの

- **Local Graph**: 選択中のページを起点に表示します。既定では `depth: 1` で直接の隣接ページを表示します。
- **Global Graph**: 現在の検索・フィルター条件に合う公開ページ全体と内部リンクを表示します。
- **Force layout**: 既定の対話的 layout です。小さな組み込み physics 実装で、重い依存は追加していません。
- **Radial layout**: Riebeckite 既存の決定的な放射状 graph を `layout: "radial"` で使えます。
- **探索操作**: hover で接続ノード・辺を強調し、無関係なノードを薄くします。ノード drag、canvas pan / zoom、クリックによるページ移動に対応します。

Graph は Riebeckite の Content Graph と public manifest を使います。ブラウザ側で Vault を再探索せず、存在しないページ・除外ページ・未公開ページはノードとして出しません。

## Obsidian との関係

公開 Digital Garden で Obsidian / Quartz ユーザーが期待する Local / Global Graph、depth 付き Local Graph、hover による隣接強調、クリック移動、drag、pan、zoom、tags、folders、backlinks、outgoing links を扱います。ただし Obsidian の見た目を完全コピーするのではなく、Riebeckite の permalink、Page System、l10n 対応 manifest、Plugin API の境界を維持します。

## 使いどころ

サイト全体のノート同士のつながりを探索する入口を提供したい場合に利用します。個別記事から辿るだけでなく、Digital Garden 全体を俯瞰できます。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../packages/plugins/garden-explorer/README_ja.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。
