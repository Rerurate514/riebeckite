---
date: 2026-10-08
title: Local Graph
---
# Local Graph

現在のノートとその周辺を表示するインタラクティブなローカルグラフです。

[English](./local-graph.md)

## 実行例

[Backlink](/ja/docs/glossary/backlink) を開くと、記事末尾にローカルグラフが表示されます。

## 推奨配置

`localGraph()` が提供する `LocalGraph` は、共通の
[`@riebeckite/graph`](https://github.com/Rerurate514/riebeckite/tree/main/packages/graph)
エンジンで現在のノートと周辺ノートを描画します。Site が `<LocalGraph />` を記事の後などに一度配置してください。リンクのないノートでも自身のノードは表示されます。

サーバーは最大3ホップ・320ノードまでをページに埋め込みます。Local Graph の Depth スライダーは3までで、切り詰めが起きたときは案内を表示します。ネットワーク全体を見るには Explorer を使ってください。

## インストール

```sh
npm install @riebeckite/plugin-local-graph
```

## クイックスタート

```ts
import { defineConfig } from "@riebeckite/core";
import { localGraph } from "@riebeckite/plugin-local-graph";

export default defineConfig({ plugins: [localGraph()] });
```

`localGraph()` はプラグイン、グラフのスタイルシート、ページ読み込み後にグラフをハイドレートするクライアントエントリを登録します。

## 操作

- ホイールまたはピンチでポインター位置を中心にズームします。
- 背景をドラッグしてパン、ノードをドラッグすると固定され、周囲のノードが反応します。
- ノードにホバーすると直接つながるノードが強調されます。
- ノートをクリックすると開きます。右クリックでは、開く・リンクをコピー・新しいタブ・Explorer の操作を選べます。
- グラフにフォーカスがあるとき、`+`/`-` でズーム、矢印キーでパン（`Shift` で高速）、`n`/`p` でノード移動、`Enter` で開く、`Escape` で選択解除できます。
- Expand ボタンで全画面表示になります。

## 設定

歯車ボタンから、Global Graph と同じ Filters / Groups / Display / Forces を開けます。

- **Filters** — 検索、タグ、添付ファイル、既存ファイルのみ、孤立ノート、Local Graph の深さ。
- **検索** は `file:`、`path:`、`tag:`、引用符、`-` による否定に対応します。未対応の演算子は、全件一致として扱わず画面に表示します。
- **Groups** — 順序付きの色分けルールです。最初に一致したグループが優先されます。
- **Display** — 矢印、ラベルのフェードしきい値、ノードサイズ、リンク太さ、アニメーション。アニメーションは frontmatter の日付を使い、日付のないノートは安定した順序で表示します。架空の日付は作りません。
- **Forces** — Center / Repel / Link force / Link distance は実行中のシミュレーションへ即時反映されます。Restore defaults で初期値に戻ります。

設定は `localStorage` の `riebeckite-local-graph-settings` に保存され、再訪問時に復元されます。

## データと公開境界

`getLocalGraph()` は `PublicContentView` と `manifest.discoverableEntries` を使います。ノートノードになるのは公開ノートだけです。非公開・下書きノートへの解決済みリンクは公開ビューで除外されるため、ブラウザ上のデータから存在を知ることはできません。未解決リンク、添付ファイル、タグは公開マニフェストの情報だけを使い、対応するフィルターが有効なときだけ表示します。

## 高度なカスタマイズ

公開ビューからはデータヘルパーで、マニフェストからは `buildLocalGraph` でグラフを解決し、コンポーネントへ渡します。

```tsx
import { LocalGraph, buildLocalGraph } from "@riebeckite/plugin-local-graph";
import { content } from "virtual:riebeckite/content";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const graph = buildLocalGraph({ manifest, config, slug, resolveTitle: getArticleTitle });

return <aside>{graph ? <LocalGraph graph={graph} /> : null}</aside>;
```

## 公開 API

- `localGraph()` — プラグインファクトリ
- `LocalGraph` — グラフデータを埋め込むサーバーコンポーネント
- `LocalGraphView` — ハイドレーションで使う表示コンポーネント
- `getLocalGraph({ view, slug })` — Site の公開ビューから取得する公開グラフデータ（ノートがない、または非公開なら `null`）
- `buildLocalGraph({ manifest, config, slug, resolveTitle })` — マニフェストから構築するグラフデータ
- 型: `LocalGraphData`、`LocalGraphNode`、`LocalGraphViewProps`
- 旧 API の `buildGraphEdges()` と `layoutRadialGraph()` は `@riebeckite/core/client` から引き続き利用できます。Local Graph の UI は固定放射状レイアウトを使いません。

## 関連資料

- [[plugin-api|プラグインシステム]]
- [`@riebeckite/plugin-backlinks`](./backlinks.ja.md)
- [`@riebeckite/plugin-garden-explorer`](./garden-explorer.ja.md)
