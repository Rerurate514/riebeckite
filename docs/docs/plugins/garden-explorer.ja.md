---
date: 2026-10-08
title: Garden Explorer
---
# Garden Explorer

ローカル／グローバルのコンテンツグラフ、検索、タグ・フォルダーフィルター、ノート詳細を1ページにまとめたインタラクティブな探索画面です。

[English](./garden-explorer.md)

## 概要

`gardenExplorer()` は3つのパネルを持つ `GardenExplorer` を提供します。

- **Explorer** — 検索欄、タグ・フォルダーの絞り込み（件数付き）、ノート一覧
- **Graph** — 公開ノートの Canvas 強制志向グラフ。ローカル／グローバル、ホバー強調、ノードドラッグ、ホイール／ピンチズーム、パン、クリックで開く操作に対応
- **Details** — 選択ノートのリンク、タグ、抜粋、関連ノート

選択状態は URL のクエリ（`?note=`、`?tag=`、`?folder=`）に反映され、共有できます。

## ローカル／グローバルグラフ

- **Local graph** は選択ノートからリンク先・被リンクをたどり、Depth の深さまで表示します。Depth 0 では選択ノートだけを表示します。
- **Global graph** は現在のフィルターに一致する公開ノート全体を表示します。

どちらも共通の `@riebeckite/graph` エンジンを使います。固定レイアウトではなく継続的な強制シミュレーションで、Barnes-Hut 方式の四分木により数千ノードでも反発力を実用的に計算します。安定するとシミュレーションは停止し、描画フレームの要求も止まります。ドラッグや力の変更時には再開します。

## グラフ設定

歯車ボタンから Filters / Groups / Display / Forces を開けます。

- **Filters** — 検索、タグ、添付ファイル、既存ファイルのみ、孤立ノート、深さ。検索は `file:`、`path:`、`tag:`、引用符、`-` 否定に対応し、未対応の演算子は画面に表示します。
- **Groups** — 順序付きの色分けルールです。最初に一致したグループが優先され、追加・削除・並べ替えができます。
- **Display** — 矢印、ラベルのフェードしきい値、ノードサイズ、リンク太さ、アニメーション。日付は frontmatter の実データだけを使い、架空の日付は作りません。
- **Forces** — Center / Repel / Link force / Link distance は即時反映されます。Restore default settings で初期値に戻ります。

設定は `localStorage` の `riebeckite-garden-graph-settings` に保存されます。Explorer の検索欄とグラフ検索は同期します。

## 操作

ホイールまたはピンチでポインター位置を中心にズームします。背景ドラッグでパン、ノードドラッグで固定し、周囲のノードが反応します。ホバーで直接の接続が強調され、クリックでノートを開きます。右クリックでは、開く・リンクをコピー・新しいタブ・ローカルグラフ・フィルターなどの操作を選べます。

キャンバスにフォーカスがあるとき、`+`/`-` でズーム、矢印キーでパン（`Shift` で高速）、`n`/`p` でノード移動、`Enter` で開く、`Escape` で選択解除できます。

## 公開データ

`getGardenExplorerData()` は `manifest.discoverableEntries` からノートとグラフを構築するため、unlisted・非公開・下書き・予約公開のノートは表示されません。見出し、本文プレーンテキスト（4,000文字まで）、タグ、フォルダー、リンク先、被リンクは公開マニフェストの情報だけを使います。グラフには、対応するフィルターが有効なときだけ未解決リンク、公開添付ファイル、タグを加えます。非公開ノートへのリンクは公開ビューで除外され、リンク先の存在も漏れません。

一覧は UI 性能のため絞り込み後の先頭80件を表示します。Global Graph は絞り込み後の全ノートを使います。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { gardenExplorer } from "@riebeckite/plugin-garden-explorer";

export default defineConfig({ plugins: [gardenExplorer()] });
```

設定例:

```ts
plugins: [
  gardenExplorer({
    depth: 1,
    showTags: true,
    showFolders: false,
    nodeSize: 1,
    linkDistance: 100,
    repulsion: 600,
  }),
];
```

旧オプションの `layout` と `showLabels` は互換性のため受け付けますが、グラフは常に継続的な強制シミュレーションを使い、ラベルは固定のオン／オフではなく Display のフェードしきい値で制御します。

`gardenExplorer()` は `/explore` ページタイプを登録し、`style.css` とクライアントハイドレーターをバンドルします。`resolveRiebeckiteRoute()` と `pluginPageSsgParams()` を使う catch-all ルートが描画・生成するため、プラグイン専用のアプリルートは不要です。ページはサーバー描画後にハイドレートされます。

### コンポーネントを別の場所に埋め込む

```tsx
import GardenExplorer, {
  getGardenExplorerData,
} from "@riebeckite/plugin-garden-explorer";

const data = getGardenExplorerData({
  manifest,
  config,
  resolveTitle: getArticleTitle,
  options: { depth: 2 },
});

return <GardenExplorer data={data} />;
```

## データ

`getGardenExplorerData()` は `GardenExplorerData` を返します。

- `notes` — 公開ノート。検索対象フィールド、`folder`、`outgoing`、`backlinks` を含む
- `edges` — 公開ノート間のノートリンク
- `graph` — Canvas エンジンが使う共通グラフドキュメント
- `tags` — タグと件数（多い順）
- `folders` — フォルダーと件数（アルファベット順、ルートは `"Root"`）
- `options` — 解決済みのグラフオプション

## 公開 API

- `gardenExplorer(options?)` — プラグインファクトリ
- `GardenExplorer` — インタラクティブな探索コンポーネント
- `getGardenExplorerData({ manifest, config, resolveTitle, options? })` — データ構築
- 型: `GardenExplorerData`、`GardenExplorerEdge`、`GardenExplorerFolder`、
  `GardenExplorerGraphLayout`、`GardenExplorerGraphMode`、`GardenExplorerNote`、
  `GardenExplorerOptions`、`GardenExplorerPluginOptions`、`GardenExplorerTag`

## 関連資料

- [[plugin-api|プラグインシステム]]
- [`@riebeckite/plugin-local-graph`](./local-graph.ja.md)
