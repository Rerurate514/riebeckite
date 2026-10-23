---
date: 2026-10-08
title: Canvas
---
# Canvas

Obsidian の `.canvas`（JSON Canvas 1.0）を図として表示するプラグインです。

[English](./canvas.md)

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { canvas } from "@riebeckite/plugin-canvas";

export default defineConfig({
  // ...
  plugins: [canvas({ render: "both" })],
});
```

このプラグインは `order: -15` で実行されます。`obsidian-markdown` の後に読み込まれます。

## 入力できるもの

1. ` ```canvas ` フェンスの本文に JSON Canvas を直接書く
2. ` ```canvas ` フェンスの本文に `![[diagram.canvas]]` または `[[diagram.canvas]]` と書き、ファイルを `contentSource` から読む
3. `![[diagram.canvas]]` を本文に直接埋め込む（添付ファイルとして解決）

`.canvas` が見つからない、または JSON Canvas として解釈できない場合はコードブロックをそのまま残し、`@riebeckite/plugin-canvas` を source とするメッセージを報告します。

## 描画結果

`div.rb-canvas` を出力します。属性は `data-canvas`（入力元）、`data-canvas-nodes`、`data-canvas-edges`、`data-canvas-render`（`static` / `client` / `both` / 描画後の `ready`）です。内部には次を置きます。

- `script[type="application/json"][data-canvas-payload]`：エスケープ済みの JSON Canvas。実行されません
- `div.rb-canvas__static`：`render` が `"static"` または `"both"` のときの静的フォールバック。絶対配置したノードカードと SVG のエッジ
- `div.rb-canvas__stage`：`render` が `"client"` または `"both"` のときの空の領域。`initCanvas()` が中身を埋めます
- `details.rb-canvas__fallback`：ノードとエッジの一覧（JavaScript なしでも内容を確認できます）

`file` ノードは `contentIndex` から解決し、ノートはパーマリンクへ、それ以外は添付 URL へリンクします。解決したノートリンクの `href` は `onManifestCreated` でマニフェストから確定し、マニフェストエントリの HTML を書き換えます。Core がその HTML をコンテンツルートの描画 HTML と同期します。`text` ノードは最小限の Markdown（wikilink とエスケープ）だけを扱います。

## クライアント側

`initCanvas()` は `data-canvas-render` が `client` / `both` の要素を探し、ペイロードからノードとエッジを組み立て、`data-canvas-render="ready"` を設定します。ready になると静的フォールバックは CSS で隠れます。ホイールで拡大縮小、ドラッグで移動できます（pan/zoom-lite）。

## 独立ページ

公開ルーティングされたノートから参照されている `.canvas` は、それ自身のページとしても配信できます。既定では無効で、明示的に有効化します。

```ts
canvas({ documentPages: true })
```

- `drawings/Architecture.canvas` → `/drawings/Architecture`
- `diagrams/System.canvas` → `/diagrams/System`

ページタイプ（`canvas-document`）は、公開エントリが埋め込んでいる Canvas を列挙し、URL を作るときに `.canvas` 拡張子を外します。埋め込み時と同じ `renderCanvas` の出力と `initCanvas` クライアントを再利用します。ページ本文には専用の `<main>` と `<h1>` を持たせます。

公開されるのは、公開ルーティングされたエントリからたどれる Canvas だけです。下書き・公開予定・その他非公開のノートからしか参照されていない Canvas は公開しません。Canvas 内のノートリンクが非公開ノートを指す場合は `#` に置き換えます。同じ URL を Markdown ページやリダイレクトが既に持っている場合は Markdown を優先し、Canvas ページは `canvas-page-conflict` を報告して生成しません。

独立ページはグローバルな出力依存（`global`）を宣言します。Canvas の追加・改名・編集・削除や、参照するノートの変更で、影響する出力を無効化します。

## オプション

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `className` | `"rb-canvas"` | ラッパー要素のクラス名 |
| `language` | `"canvas"` | 対象のコードフェンス言語 |
| `render` | `"both"` | `"static"`、`"client"`、`"both"` のいずれで描画するか |
| `height` | 未設定 | ステージの高さ（px 数値または CSS 長さ） |
| `maxNodes` | 未設定 | 描画するノード数の上限 |
| `documentPages` | `false` | 参照されている Canvas を独立ページとして配信する |

## 主なエクスポート

- `canvas(options?)` / `canvasPlugin`：プラグインを作成する
- `initCanvas()`：クライアント側の描画を初期化する
- `parseCanvas(json)`：JSON Canvas を解析する（純粋関数）
- `buildCanvasLayout(doc)`：座標を正規化し、エッジを線分に解決する（純粋関数）
- `resolveCanvasOptions(options)`：既定値を適用する
- 型: `CanvasOptions`、`CanvasRenderMode`、`CanvasDocument`、`CanvasNode`、`CanvasEdge` ほか

## 関連資料

- [[plugin-api|プラグインシステム]]
