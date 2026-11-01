# @riebeckite/graph

Riebeckite の Local Graph と Garden Explorer が共有するグラフエンジンです。

[English](./README.md)

## 提供する機能

`@riebeckite/graph` は公開コンテンツのマニフェストからグラフドキュメントを構築し、Canvas 2D の強制シミュレーションと Obsidian 風の操作 UI で描画します。記事内の Local Graph と Global Graph が同じエンジンを使うため、物理演算、カメラ、フィルター、グループ、設定の保存、ライフサイクル管理をプラグインごとに複製していません。

- 公開エントリ、未解決リンク、公開添付ファイル、タグからサーバー側でデータを構築
- Obsidian 互換の検索サブセット: `file:`、`path:`、`tag:`、引用符、`-` 否定
- タグ、添付ファイル、未解決ファイル、孤立ノートのフィルター
- 順序付きの色分けグループ（最初に一致したものが優先）
- Center / Repel / Link / Link distance の継続的な力。初期配置は再現性があり、安定後は自動停止
- ポインター中心のホイール／ピンチズーム、背景パン、ノードドラッグ、ホバー強調、ズームに応じたラベルのフェード、矢印、グループ、アニメーション、ポインター／キーボード／右クリック操作を備えた Canvas レンダラー
- `localStorage` による設定の保存と復元
- 画面外・非表示時の一時停止と、SPA ページ遷移時の確実な解放

## 使い方

```ts
import {
  buildGraphDocument,
  buildVisibleGraph,
  DEFAULT_GRAPH_SETTINGS,
} from "@riebeckite/graph";
import { createGraphRenderer } from "@riebeckite/graph/client";
```

公開エントリからドキュメントを構築します。

```ts
const document = buildGraphDocument(
  entries.map((entry) => ({
    slug: entry.slug,
    title: entry.title,
    permalink: entry.permalink,
    tags: entry.tags,
    links: entry.links,
    assets: entry.assets,
    date: entry.date ?? null,
  })),
  { centerSlug: entry.slug },
);
```

ブラウザ専用の effect でレンダラーをマウントします。

```ts
const renderer = createGraphRenderer({
  canvas,
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
});

renderer.update({
  document,
  settings: DEFAULT_GRAPH_SETTINGS,
  mode: "global",
});

return () => renderer.destroy();
```

UI をそのまま使う場合:

```tsx
import GraphView from "@riebeckite/graph/ui";
import "@riebeckite/graph/style.css";

<GraphView
  document={document}
  mode="local"
  centerId={entry.slug}
  initialSettings={{ depth: 1 }}
  maxDepth={3}
  expandable
  storageKey="example-graph-settings"
/>;
```

`GraphView` はサーバー描画に対応します。レンダラーの生成と `localStorage` の読み書きは effect 内だけで行うため、Riebeckite のプラグインが使うクライアントライフサイクルでハイドレートできます。

## 設定

公開データモデルで表現できる範囲は Obsidian の Graph View に合わせています。

| 設定 | 初期値 | 範囲 |
| --- | --- | --- |
| Depth | 2 | 0–5 |
| Tags | オン | — |
| Attachments | オン | — |
| Existing files only | オフ | — |
| Orphans | オン | — |
| Arrows | オフ | — |
| Text fade threshold | 0.35 | 0–1 |
| Node size | 1 | 0.5–2.5 |
| Link thickness | 1 | 0.25–3 |
| Center force | 0.35 | 0–1 |
| Repel force | 600 | 0–2000 |
| Link force | 0.7 | 0–1 |
| Link distance | 100 | 30–500 |

`normalizeGraphSettings()` は保存値をクランプし、不正なグループを除外します。設定パネルの Restore defaults は、モードごとの Depth 上限を保ったまま初期値へ戻します。

## 公開境界

グラフの入力は `manifest.discoverableEntries` または `PublicContentView.discoverableEntries` から構築してください。非公開、下書き、予約公開、unlisted のエントリをブラウザへ渡してはいけません。非公開ノートへの解決済みリンクは `PublicContentView` が除去し、未解決リンクは公開ノートにすでに書かれているテキストだけを保持します。`buildGraphDocument` も、渡されたエントリに存在しないノートへのリンクを破棄します。

## 性能

シミュレーションは小規模グラフでは全ペアの反発力、250ノード超では Barnes-Hut 方式の四分木を使います。レンダラーは Canvas 2D、デバイスピクセル比の上限2、画面外の辺・ノードのスキップ、高密度時のラベル数制限を行い、シミュレーションが安定すると `requestAnimationFrame` の要求を止めます。

`pnpm --filter @riebeckite/graph benchmark` は 100 / 675 / 1,000 / 3,000 ノードを低密度・高密度の辺で計測します。開発機では約3,600リンクの3,000ノードが約1.15秒（1ティック約3.8ms）で安定します。ブラウザではこの規模でも平均フレーム時間は60Hzの1フレーム以内ですが、約11,900リンクの高密度3,000ノードでは一部のフレームで超えます（平均約12.4ms、95パーセンタイル約24ms）。数値は実行環境に依存します。

`d3-force` も既定エンジンの候補として評価しました。独自シミュレーションを採用した理由は、決定的な初期配置、ドラッグ時の固定・解放と再加熱の明示的な制御、両プラグインで共有できる依存なしの小さな実装面です。Barnes-Hut 方式の四分木により、実行時依存を増やさずに同等のオーダーの反発計算を行います。`d3-force` のすべての挙動を置き換えるものではありません。

## 公開 API

- `buildGraphDocument(entries, options)`
- `sliceGraphDocument(document, centerId, depth, maxNodes)`
- `buildVisibleGraph({ document, settings, mode, centerId })`
- `collectLocalNodeIds(adjacency, centerId, depth)`
- `parseGraphQuery`、`matchesGraphQuery`、`normalizeGraphText`
- `createGraphSimulation`、`buildRevealSchedule`、`hasDatedNodes`
- `DEFAULT_GRAPH_SETTINGS`、`GRAPH_SETTINGS_RANGES`、`mergeGraphSettings`、
  `normalizeGraphSettings`、`readStoredGraphSettings`、
  `writeStoredGraphSettings`
- `@riebeckite/graph/client`: `createGraphRenderer`
- `@riebeckite/graph/ui`: デフォルトの `GraphView`
- 型: `GraphDocument`、`GraphNode`、`GraphLink`、`GraphSettings`、
  `GraphGroup`、`GraphMode`、`VisibleGraph`、`VisibleGraphNode`、
  `GraphRenderer`、`GraphViewProps`

## 開発

```sh
pnpm --filter @riebeckite/graph test
pnpm --filter @riebeckite/graph benchmark
pnpm --filter @riebeckite/graph build
```
